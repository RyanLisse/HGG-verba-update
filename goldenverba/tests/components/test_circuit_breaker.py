"""Test Circuit Breaker Pattern using TDD London School methodology.

This module tests the behavior and contracts of circuit breaker implementation,
focusing on mock-driven development and state transition verification.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from goldenverba.components.circuit_breaker import (
    CircuitBreakerState,
    WeaviateCircuitBreaker,
    CircuitBreakerConfig,
    StateTransition,
    FailureThreshold,
    TimeWindow,
    HealthChecker,
)
from goldenverba.components.exceptions import (
    WeaviateError,
    WeaviateConnectionError,
    WeaviateCircuitBreakerError,
)


class TestCircuitBreakerStateTransitions:
    """Test circuit breaker state transitions using mock-driven approach."""

    def setup_method(self):
        self.mock_failure_threshold = Mock(spec=FailureThreshold)
        self.mock_time_window = Mock(spec=TimeWindow)
        self.mock_health_checker = Mock(spec=HealthChecker)

    def test_should_transition_from_closed_to_open_on_threshold_breach(self):
        """Test transition from CLOSED to OPEN when failure threshold is breached."""
        # Given: Circuit breaker in CLOSED state with threshold about to be breached
        self.mock_failure_threshold.is_threshold_breached.return_value = True
        self.mock_time_window.is_within_window.return_value = True
        
        circuit_breaker = WeaviateCircuitBreaker(
            failure_threshold=self.mock_failure_threshold,
            time_window=self.mock_time_window,
            initial_state=CircuitBreakerState.CLOSED
        )
        
        # When: Recording a failure
        error = WeaviateConnectionError("Connection failed")
        circuit_breaker.record_failure(error)
        
        # Then: Should transition to OPEN state
        self.mock_failure_threshold.increment_failure.assert_called_with(error)
        self.mock_failure_threshold.is_threshold_breached.assert_called_once()
        assert circuit_breaker.current_state == CircuitBreakerState.OPEN

    def test_should_transition_from_open_to_half_open_after_timeout(self):
        """Test transition from OPEN to HALF_OPEN after timeout period."""
        # Given: Circuit breaker in OPEN state with timeout expired
        self.mock_time_window.is_timeout_expired.return_value = True
        
        circuit_breaker = WeaviateCircuitBreaker(
            time_window=self.mock_time_window,
            initial_state=CircuitBreakerState.OPEN
        )
        
        # When: Checking if request should be allowed
        should_allow = circuit_breaker.should_allow_request()
        
        # Then: Should transition to HALF_OPEN and allow request
        self.mock_time_window.is_timeout_expired.assert_called_once()
        assert circuit_breaker.current_state == CircuitBreakerState.HALF_OPEN
        assert should_allow is True

    def test_should_transition_from_half_open_to_closed_on_success(self):
        """Test transition from HALF_OPEN to CLOSED on successful operation."""
        # Given: Circuit breaker in HALF_OPEN state
        circuit_breaker = WeaviateCircuitBreaker(
            failure_threshold=self.mock_failure_threshold,
            initial_state=CircuitBreakerState.HALF_OPEN
        )
        
        # When: Recording a successful operation
        circuit_breaker.record_success()
        
        # Then: Should transition to CLOSED state and reset failures
        self.mock_failure_threshold.reset.assert_called_once()
        assert circuit_breaker.current_state == CircuitBreakerState.CLOSED

    def test_should_transition_from_half_open_to_open_on_failure(self):
        """Test transition from HALF_OPEN to OPEN on operation failure."""
        # Given: Circuit breaker in HALF_OPEN state
        circuit_breaker = WeaviateCircuitBreaker(
            failure_threshold=self.mock_failure_threshold,
            initial_state=CircuitBreakerState.HALF_OPEN
        )
        
        # When: Recording a failure
        error = WeaviateConnectionError("Still failing")
        circuit_breaker.record_failure(error)
        
        # Then: Should transition back to OPEN state
        self.mock_failure_threshold.increment_failure.assert_called_with(error)
        assert circuit_breaker.current_state == CircuitBreakerState.OPEN


class TestFailureThresholdBehavior:
    """Test failure threshold behavior using contract verification."""

    def setup_method(self):
        self.mock_error_classifier = Mock()
        self.mock_metrics_collector = Mock()

    def test_should_count_only_relevant_failures(self):
        """Test that threshold counts only failures that matter for circuit breaking."""
        # Given: Error classifier that filters relevant errors
        self.mock_error_classifier.is_circuit_breaking_error.side_effect = [True, False, True]
        
        threshold = FailureThreshold(
            max_failures=3,
            error_classifier=self.mock_error_classifier
        )
        
        # When: Recording mixed error types
        errors = [
            WeaviateConnectionError("Network error"),
            WeaviateError("Minor error"),
            WeaviateConnectionError("Another network error")
        ]
        
        for error in errors:
            threshold.increment_failure(error)
        
        # Then: Should count only circuit-breaking errors
        assert threshold.current_count == 2
        assert self.mock_error_classifier.is_circuit_breaking_error.call_count == 3

    def test_should_coordinate_with_metrics_collection(self):
        """Test that threshold coordinates with metrics collection."""
        # Given: Threshold with metrics collector
        threshold = FailureThreshold(
            max_failures=5,
            metrics_collector=self.mock_metrics_collector
        )
        
        # When: Incrementing failure count
        error = WeaviateConnectionError("Connection failed")
        threshold.increment_failure(error)
        
        # Then: Should report metrics
        self.mock_metrics_collector.record_failure.assert_called_with(error)
        self.mock_metrics_collector.update_failure_count.assert_called_with(1)

    def test_should_detect_threshold_breach_correctly(self):
        """Test threshold breach detection behavior."""
        # Given: Threshold approaching limit
        threshold = FailureThreshold(max_failures=3)
        
        # When: Adding failures up to threshold
        for i in range(3):
            threshold.increment_failure(WeaviateConnectionError(f"Error {i}"))
        
        # Then: Should detect breach
        assert threshold.is_threshold_breached() is True
        assert threshold.current_count == 3


class TestTimeWindowBehavior:
    """Test time window behavior and coordination."""

    def setup_method(self):
        self.mock_timer = Mock()

    def test_should_track_failure_time_windows(self):
        """Test that time window tracks failures within specified periods."""
        # Given: Time window with timer mock
        self.mock_timer.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
        
        time_window = TimeWindow(
            window_duration=timedelta(minutes=5),
            timer=self.mock_timer
        )
        
        # When: Checking if within window
        failure_time = datetime(2024, 1, 1, 11, 58, 0)  # 2 minutes ago
        is_within = time_window.is_within_window(failure_time)
        
        # Then: Should be within window
        assert is_within is True

    def test_should_detect_timeout_expiration(self):
        """Test timeout expiration detection."""
        # Given: Time window with expired timeout
        self.mock_timer.now.return_value = datetime(2024, 1, 1, 12, 0, 0)
        
        time_window = TimeWindow(
            timeout_duration=timedelta(seconds=30),
            timer=self.mock_timer
        )
        
        # Set last failure time to more than timeout duration ago
        time_window._last_failure_time = datetime(2024, 1, 1, 11, 59, 0)  # 1 minute ago
        
        # When: Checking timeout expiration
        is_expired = time_window.is_timeout_expired()
        
        # Then: Should detect expiration
        assert is_expired is True

    def test_should_coordinate_with_sliding_window_calculator(self):
        """Test coordination with sliding window calculations."""
        # Given: Time window with sliding calculator
        mock_sliding_calculator = Mock()
        mock_sliding_calculator.get_failures_in_window.return_value = 3
        
        time_window = TimeWindow(
            window_duration=timedelta(minutes=5),
            sliding_calculator=mock_sliding_calculator
        )
        
        # When: Getting failure count in window
        count = time_window.get_failure_count_in_window()
        
        # Then: Should delegate to sliding calculator
        mock_sliding_calculator.get_failures_in_window.assert_called_once()
        assert count == 3


class TestHealthCheckerIntegration:
    """Test health checker integration with circuit breaker."""

    def setup_method(self):
        self.mock_health_probe = Mock()
        self.mock_recovery_strategy = Mock()

    def test_should_perform_health_checks_in_half_open_state(self):
        """Test that health checks are performed in HALF_OPEN state."""
        # Given: Health checker with probe
        self.mock_health_probe.check_health.return_value = True
        
        health_checker = HealthChecker(
            health_probe=self.mock_health_probe
        )
        
        # When: Performing health check
        is_healthy = health_checker.is_system_healthy()
        
        # Then: Should delegate to health probe
        self.mock_health_probe.check_health.assert_called_once()
        assert is_healthy is True

    def test_should_coordinate_with_recovery_strategy(self):
        """Test coordination with recovery strategies."""
        # Given: Health checker with recovery strategy
        self.mock_recovery_strategy.attempt_recovery.return_value = True
        
        health_checker = HealthChecker(
            recovery_strategy=self.mock_recovery_strategy
        )
        
        # When: Attempting recovery
        recovery_result = health_checker.attempt_recovery()
        
        # Then: Should delegate to recovery strategy
        self.mock_recovery_strategy.attempt_recovery.assert_called_once()
        assert recovery_result is True


class TestCircuitBreakerObservability:
    """Test circuit breaker observability and monitoring."""

    def setup_method(self):
        self.mock_state_monitor = Mock()
        self.mock_metrics_collector = Mock()
        self.mock_event_publisher = Mock()

    def test_should_publish_state_transition_events(self):
        """Test that state transitions are published for monitoring."""
        # Given: Circuit breaker with event publisher
        circuit_breaker = WeaviateCircuitBreaker(
            event_publisher=self.mock_event_publisher
        )
        
        # When: Transitioning states
        circuit_breaker._transition_to_state(CircuitBreakerState.OPEN)
        
        # Then: Should publish transition event
        self.mock_event_publisher.publish_state_transition.assert_called_with(
            from_state=CircuitBreakerState.CLOSED,
            to_state=CircuitBreakerState.OPEN,
            timestamp=circuit_breaker._last_state_change
        )

    def test_should_collect_circuit_breaker_metrics(self):
        """Test that circuit breaker metrics are collected."""
        # Given: Circuit breaker with metrics collector
        circuit_breaker = WeaviateCircuitBreaker(
            metrics_collector=self.mock_metrics_collector
        )
        
        # When: Recording failure
        error = WeaviateConnectionError("Connection failed")
        circuit_breaker.record_failure(error)
        
        # Then: Should collect metrics
        self.mock_metrics_collector.increment_circuit_breaker_failures.assert_called_with(
            error_type=type(error).__name__
        )

    def test_should_coordinate_with_alerting_system(self):
        """Test coordination with alerting when circuit opens."""
        # Given: Circuit breaker with alerting
        mock_alerting = Mock()
        
        circuit_breaker = WeaviateCircuitBreaker(
            failure_threshold=Mock(is_threshold_breached=Mock(return_value=True)),
            alerting=mock_alerting
        )
        
        # When: Circuit breaker opens
        circuit_breaker.record_failure(WeaviateConnectionError("Critical failure"))
        
        # Then: Should trigger alert
        mock_alerting.send_circuit_breaker_alert.assert_called_with(
            state=CircuitBreakerState.OPEN,
            reason="Failure threshold breached"
        )


class TestCircuitBreakerConfiguration:
    """Test circuit breaker configuration and dependency injection."""

    def test_should_configure_from_settings(self):
        """Test that circuit breaker configures from settings object."""
        # Given: Configuration settings
        mock_config = Mock()
        mock_config.failure_threshold = 5
        mock_config.timeout_duration = timedelta(seconds=60)
        mock_config.window_duration = timedelta(minutes=10)
        
        # When: Creating circuit breaker from config
        circuit_breaker = WeaviateCircuitBreaker.from_config(mock_config)
        
        # Then: Should apply configuration
        assert circuit_breaker.failure_threshold.max_failures == 5
        assert circuit_breaker.time_window.timeout_duration == timedelta(seconds=60)

    def test_should_inject_dependencies_correctly(self):
        """Test dependency injection for testability."""
        # Given: Mock dependencies
        mock_failure_threshold = Mock()
        mock_time_window = Mock()
        mock_health_checker = Mock()
        
        # When: Creating circuit breaker with injected dependencies
        circuit_breaker = WeaviateCircuitBreaker(
            failure_threshold=mock_failure_threshold,
            time_window=mock_time_window,
            health_checker=mock_health_checker
        )
        
        # Then: Should use injected dependencies
        assert circuit_breaker.failure_threshold == mock_failure_threshold
        assert circuit_breaker.time_window == mock_time_window
        assert circuit_breaker.health_checker == mock_health_checker


class TestSwarmCoordination:
    """Test circuit breaker coordination with swarm agents."""

    def test_should_share_circuit_state_with_swarm(self):
        """Test that circuit breaker shares state with other swarm agents."""
        # Given: Circuit breaker with swarm coordinator
        mock_swarm_coordinator = Mock()
        
        circuit_breaker = WeaviateCircuitBreaker(
            swarm_coordinator=mock_swarm_coordinator
        )
        
        # When: Circuit breaker state changes
        circuit_breaker._transition_to_state(CircuitBreakerState.OPEN)
        
        # Then: Should notify swarm
        mock_swarm_coordinator.broadcast_circuit_state.assert_called_with(
            circuit_id=circuit_breaker.circuit_id,
            state=CircuitBreakerState.OPEN,
            metadata={"failure_count": 0, "last_failure": None}
        )

    def test_should_coordinate_with_load_balancer_agent(self):
        """Test coordination with load balancer for traffic routing."""
        # Given: Circuit breaker with load balancer coordination
        mock_load_balancer = Mock()
        
        circuit_breaker = WeaviateCircuitBreaker(
            load_balancer=mock_load_balancer
        )
        
        # When: Circuit opens
        circuit_breaker._transition_to_state(CircuitBreakerState.OPEN)
        
        # Then: Should notify load balancer
        mock_load_balancer.update_endpoint_status.assert_called_with(
            endpoint=circuit_breaker.protected_endpoint,
            status="UNAVAILABLE"
        )