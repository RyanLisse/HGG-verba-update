"""Circuit Breaker Pattern implementation for Weaviate operations.

This module provides circuit breaker functionality following TDD London School principles,
with emphasis on state management, failure detection, and recovery strategies.
"""

import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol
from dataclasses import dataclass, field

from .exceptions import WeaviateError, WeaviateCircuitBreakerError


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Failing, rejecting requests
    HALF_OPEN = "HALF_OPEN"  # Testing if service recovered


class ErrorClassifier(Protocol):
    """Protocol for classifying errors for circuit breaking."""
    
    def is_circuit_breaking_error(self, error: WeaviateError) -> bool:
        """Determine if error should contribute to circuit breaking."""
        ...


class MetricsCollector(Protocol):
    """Protocol for metrics collection."""
    
    def record_failure(self, error: WeaviateError) -> None:
        """Record failure for metrics."""
        ...
    
    def update_failure_count(self, count: int) -> None:
        """Update failure count metric."""
        ...
    
    def increment_circuit_breaker_failures(self, error_type: str) -> None:
        """Increment circuit breaker failure metrics."""
        ...


class Timer(Protocol):
    """Protocol for time operations."""
    
    def now(self) -> datetime:
        """Get current time."""
        ...


class SlidingWindowCalculator(Protocol):
    """Protocol for sliding window calculations."""
    
    def get_failures_in_window(self) -> int:
        """Get failure count in current window."""
        ...


class HealthProbe(Protocol):
    """Protocol for health checking."""
    
    def check_health(self) -> bool:
        """Check if system is healthy."""
        ...


class RecoveryStrategy(Protocol):
    """Protocol for recovery strategies."""
    
    def attempt_recovery(self) -> bool:
        """Attempt to recover from failures."""
        ...


class EventPublisher(Protocol):
    """Protocol for publishing circuit breaker events."""
    
    def publish_state_transition(
        self, 
        from_state: CircuitBreakerState, 
        to_state: CircuitBreakerState,
        timestamp: datetime
    ) -> None:
        """Publish state transition event."""
        ...


class Alerting(Protocol):
    """Protocol for alerting system."""
    
    def send_circuit_breaker_alert(self, state: CircuitBreakerState, reason: str) -> None:
        """Send circuit breaker alert."""
        ...


class SwarmCoordinator(Protocol):
    """Protocol for swarm coordination."""
    
    def broadcast_circuit_state(
        self, 
        circuit_id: str, 
        state: CircuitBreakerState,
        metadata: Dict[str, Any]
    ) -> None:
        """Broadcast circuit breaker state to swarm."""
        ...


class LoadBalancer(Protocol):
    """Protocol for load balancer coordination."""
    
    def update_endpoint_status(self, endpoint: str, status: str) -> None:
        """Update endpoint status in load balancer."""
        ...


@dataclass
class StateTransition:
    """Represents a state transition event."""
    from_state: CircuitBreakerState
    to_state: CircuitBreakerState
    timestamp: datetime
    reason: str


class FailureThreshold:
    """Manages failure counting and threshold detection.
    
    Coordinates with error classification and metrics collection.
    """
    
    def __init__(
        self,
        max_failures: int,
        error_classifier: Optional[ErrorClassifier] = None,
        metrics_collector: Optional[MetricsCollector] = None
    ):
        self.max_failures = max_failures
        self.current_count = 0
        self._error_classifier = error_classifier
        self._metrics_collector = metrics_collector
    
    def increment_failure(self, error: WeaviateError) -> None:
        """Increment failure count if error is relevant for circuit breaking."""
        # Check if error should contribute to circuit breaking
        if self._error_classifier:
            if not self._error_classifier.is_circuit_breaking_error(error):
                return
        
        self.current_count += 1
        
        # Report metrics
        if self._metrics_collector:
            self._metrics_collector.record_failure(error)
            self._metrics_collector.update_failure_count(self.current_count)
    
    def is_threshold_breached(self) -> bool:
        """Check if failure threshold has been breached."""
        return self.current_count >= self.max_failures
    
    def reset(self) -> None:
        """Reset failure count."""
        self.current_count = 0


class TimeWindow:
    """Manages time-based operations for circuit breaker.
    
    Coordinates with timing and sliding window calculations.
    """
    
    def __init__(
        self,
        window_duration: Optional[timedelta] = None,
        timeout_duration: Optional[timedelta] = None,
        timer: Optional[Timer] = None,
        sliding_calculator: Optional[SlidingWindowCalculator] = None
    ):
        self.window_duration = window_duration or timedelta(minutes=5)
        self.timeout_duration = timeout_duration or timedelta(seconds=60)
        self._timer = timer or DefaultTimer()
        self._sliding_calculator = sliding_calculator
        self._last_failure_time: Optional[datetime] = None
    
    def is_within_window(self, failure_time: datetime) -> bool:
        """Check if failure time is within the current window."""
        current_time = self._timer.now()
        return current_time - failure_time <= self.window_duration
    
    def is_timeout_expired(self) -> bool:
        """Check if timeout period has expired since last failure."""
        if self._last_failure_time is None:
            return True
        
        current_time = self._timer.now()
        return current_time - self._last_failure_time >= self.timeout_duration
    
    def get_failure_count_in_window(self) -> int:
        """Get failure count in current window."""
        if self._sliding_calculator:
            return self._sliding_calculator.get_failures_in_window()
        return 0
    
    def record_failure_time(self, failure_time: Optional[datetime] = None) -> None:
        """Record time of failure."""
        self._last_failure_time = failure_time or self._timer.now()


class HealthChecker:
    """Manages health checking for circuit breaker recovery.
    
    Coordinates with health probes and recovery strategies.
    """
    
    def __init__(
        self,
        health_probe: Optional[HealthProbe] = None,
        recovery_strategy: Optional[RecoveryStrategy] = None
    ):
        self._health_probe = health_probe
        self._recovery_strategy = recovery_strategy
    
    def is_system_healthy(self) -> bool:
        """Check if system is healthy."""
        if self._health_probe:
            return self._health_probe.check_health()
        return True
    
    def attempt_recovery(self) -> bool:
        """Attempt system recovery."""
        if self._recovery_strategy:
            return self._recovery_strategy.attempt_recovery()
        return False


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    timeout_duration: timedelta = field(default_factory=lambda: timedelta(seconds=60))
    window_duration: timedelta = field(default_factory=lambda: timedelta(minutes=5))


class WeaviateCircuitBreaker:
    """Circuit breaker implementation for Weaviate operations.
    
    Follows London School TDD with emphasis on collaboration and state management.
    """
    
    def __init__(
        self,
        failure_threshold: Optional[FailureThreshold] = None,
        time_window: Optional[TimeWindow] = None,
        health_checker: Optional[HealthChecker] = None,
        initial_state: CircuitBreakerState = CircuitBreakerState.CLOSED,
        metrics_collector: Optional[MetricsCollector] = None,
        event_publisher: Optional[EventPublisher] = None,
        alerting: Optional[Alerting] = None,
        swarm_coordinator: Optional[SwarmCoordinator] = None,
        load_balancer: Optional[LoadBalancer] = None,
        protected_endpoint: str = "weaviate"
    ):
        self.circuit_id = str(uuid.uuid4())
        self.protected_endpoint = protected_endpoint
        self.current_state = initial_state
        self._last_state_change = datetime.now()
        
        # Collaborator dependencies
        self.failure_threshold = failure_threshold or FailureThreshold(max_failures=5)
        self.time_window = time_window or TimeWindow()
        self.health_checker = health_checker or HealthChecker()
        self._metrics_collector = metrics_collector
        self._event_publisher = event_publisher
        self._alerting = alerting
        self._swarm_coordinator = swarm_coordinator
        self._load_balancer = load_balancer
    
    @classmethod
    def from_config(cls, config: CircuitBreakerConfig) -> 'WeaviateCircuitBreaker':
        """Create circuit breaker from configuration."""
        failure_threshold = FailureThreshold(max_failures=config.failure_threshold)
        time_window = TimeWindow(
            timeout_duration=config.timeout_duration,
            window_duration=config.window_duration
        )
        
        return cls(
            failure_threshold=failure_threshold,
            time_window=time_window
        )
    
    def should_allow_request(self) -> bool:
        """Determine if request should be allowed based on circuit state."""
        if self.current_state == CircuitBreakerState.CLOSED:
            return True
        elif self.current_state == CircuitBreakerState.OPEN:
            # Check if timeout has expired
            if self.time_window.is_timeout_expired():
                self._transition_to_state(CircuitBreakerState.HALF_OPEN)
                return True
            return False
        elif self.current_state == CircuitBreakerState.HALF_OPEN:
            # Allow limited requests in half-open state
            return True
        
        return False
    
    def record_failure(self, error: WeaviateError) -> None:
        """Record operation failure and update circuit state."""
        # Record failure time
        self.time_window.record_failure_time()
        
        # Increment failure count
        self.failure_threshold.increment_failure(error)
        
        # Collect metrics
        if self._metrics_collector:
            self._metrics_collector.increment_circuit_breaker_failures(
                error_type=type(error).__name__
            )
        
        # Check for state transitions
        if self.current_state == CircuitBreakerState.CLOSED:
            if self.failure_threshold.is_threshold_breached():
                self._transition_to_state(CircuitBreakerState.OPEN)
        elif self.current_state == CircuitBreakerState.HALF_OPEN:
            # Any failure in half-open goes back to open
            self._transition_to_state(CircuitBreakerState.OPEN)
    
    def record_success(self) -> None:
        """Record successful operation."""
        if self.current_state == CircuitBreakerState.HALF_OPEN:
            # Success in half-open state means recovery
            self.failure_threshold.reset()
            self._transition_to_state(CircuitBreakerState.CLOSED)
    
    def _transition_to_state(self, new_state: CircuitBreakerState) -> None:
        """Transition to new circuit breaker state."""
        old_state = self.current_state
        self.current_state = new_state
        self._last_state_change = datetime.now()
        
        # Publish state transition event
        if self._event_publisher:
            self._event_publisher.publish_state_transition(
                from_state=old_state,
                to_state=new_state,
                timestamp=self._last_state_change
            )
        
        # Send alerts for critical state changes
        if self._alerting and new_state == CircuitBreakerState.OPEN:
            self._alerting.send_circuit_breaker_alert(
                state=new_state,
                reason="Failure threshold breached"
            )
        
        # Coordinate with swarm
        if self._swarm_coordinator:
            self._swarm_coordinator.broadcast_circuit_state(
                circuit_id=self.circuit_id,
                state=new_state,
                metadata={
                    "failure_count": self.failure_threshold.current_count,
                    "last_failure": self.time_window._last_failure_time
                }
            )
        
        # Update load balancer
        if self._load_balancer:
            status = "AVAILABLE" if new_state == CircuitBreakerState.CLOSED else "UNAVAILABLE"
            self._load_balancer.update_endpoint_status(
                endpoint=self.protected_endpoint,
                status=status
            )
    
    def get_circuit_stats(self) -> Dict[str, Any]:
        """Get current circuit breaker statistics."""
        return {
            "circuit_id": self.circuit_id,
            "state": self.current_state.value,
            "failure_count": self.failure_threshold.current_count,
            "last_state_change": self._last_state_change.isoformat(),
            "protected_endpoint": self.protected_endpoint
        }


# Default implementations
class DefaultTimer:
    """Default timer implementation."""
    
    def now(self) -> datetime:
        """Get current time."""
        return datetime.now()


class DefaultErrorClassifier:
    """Default error classifier for circuit breaking."""
    
    def is_circuit_breaking_error(self, error: WeaviateError) -> bool:
        """Consider connection and timeout errors as circuit breaking."""
        from .exceptions import WeaviateConnectionError, WeaviateTimeoutError
        return isinstance(error, (WeaviateConnectionError, WeaviateTimeoutError))


class DefaultHealthProbe:
    """Default health probe implementation."""
    
    def check_health(self) -> bool:
        """Default health check always returns True."""
        return True