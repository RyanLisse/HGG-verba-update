"""Test Weaviate Exception Hierarchy using TDD London School methodology.

This module tests the behavior and contracts of exception classes,
focusing on mock-driven development and error handling patterns.
"""

import pytest
from unittest.mock import Mock, patch
from goldenverba.components.exceptions import (
    WeaviateError,
    WeaviateConnectionError,
    WeaviateBatchError,
    WeaviateRetryableError,
    WeaviatePermanentError,
    WeaviateTimeoutError,
    WeaviateCircuitBreakerError,
    ErrorClassifier,
    ErrorReporter,
)


class TestWeaviateErrorHierarchy:
    """Test the error hierarchy contracts and behavior."""

    def test_should_create_base_weaviate_error_with_context(self):
        """Test that base error captures operation context."""
        # Given: Error context information
        operation = "batch_insert"
        details = {"batch_size": 100, "collection": "test"}
        
        # When: Creating base error
        error = WeaviateError(
            message="Operation failed",
            operation=operation,
            details=details
        )
        
        # Then: Should capture all context
        assert str(error) == "Operation failed"
        assert error.operation == operation
        assert error.details == details
        assert error.timestamp is not None

    def test_should_distinguish_retryable_from_permanent_errors(self):
        """Test that error types define retry behavior contracts."""
        # Given: Different error types
        retryable_error = WeaviateRetryableError("Temporary failure")
        permanent_error = WeaviatePermanentError("Invalid schema")
        
        # When: Checking retry capability
        # Then: Should have correct retry behavior
        assert retryable_error.is_retryable is True
        assert permanent_error.is_retryable is False

    def test_should_create_connection_error_with_endpoint_info(self):
        """Test that connection errors capture endpoint details."""
        # Given: Connection failure details
        endpoint = "http://localhost:8080"
        timeout = 30
        
        # When: Creating connection error
        error = WeaviateConnectionError(
            message="Connection failed",
            endpoint=endpoint,
            timeout=timeout
        )
        
        # Then: Should capture connection context
        assert error.endpoint == endpoint
        assert error.timeout == timeout
        assert error.is_retryable is True

    def test_should_create_batch_error_with_operation_details(self):
        """Test that batch errors capture batch operation context."""
        # Given: Batch operation details
        batch_size = 500
        failed_items = [1, 5, 10]
        collection_name = "documents"
        
        # When: Creating batch error
        error = WeaviateBatchError(
            message="Batch operation failed",
            batch_size=batch_size,
            failed_items=failed_items,
            collection_name=collection_name
        )
        
        # Then: Should capture batch context
        assert error.batch_size == batch_size
        assert error.failed_items == failed_items
        assert error.collection_name == collection_name
        assert error.success_count == batch_size - len(failed_items)


class TestErrorClassifier:
    """Test error classification behavior using mock-driven approach."""

    def setup_method(self):
        self.mock_status_analyzer = Mock()
        self.mock_message_analyzer = Mock()

    def test_should_classify_http_status_based_errors(self):
        """Test that classifier identifies error types by HTTP status."""
        # Given: Status analyzer mock
        self.mock_status_analyzer.extract_status.return_value = 429
        self.mock_status_analyzer.is_retryable_status.return_value = True
        
        # When: Classifying error
        classifier = ErrorClassifier(
            status_analyzer=self.mock_status_analyzer,
            message_analyzer=self.mock_message_analyzer
        )
        
        mock_exception = Mock()
        mock_exception.status_code = 429
        is_retryable = classifier.is_retryable(mock_exception)
        
        # Then: Should delegate to status analyzer
        self.mock_status_analyzer.is_retryable_status.assert_called_with(429)
        assert is_retryable is True

    def test_should_classify_timeout_errors_as_retryable(self):
        """Test that timeout errors are classified as retryable."""
        # Given: Message analyzer identifies timeout
        self.mock_message_analyzer.contains_timeout_indicator.return_value = True
        
        # When: Classifying timeout error
        classifier = ErrorClassifier(
            status_analyzer=self.mock_status_analyzer,
            message_analyzer=self.mock_message_analyzer
        )
        
        timeout_exception = TimeoutError("Connection timed out")
        is_retryable = classifier.is_retryable(timeout_exception)
        
        # Then: Should classify as retryable
        self.mock_message_analyzer.contains_timeout_indicator.assert_called_with(
            "Connection timed out"
        )
        assert is_retryable is True

    def test_should_create_appropriate_weaviate_error_type(self):
        """Test that classifier creates correct error types."""
        # Given: Error type factory mock
        mock_error_factory = Mock()
        mock_connection_error = Mock(spec=WeaviateConnectionError)
        mock_error_factory.create_connection_error.return_value = mock_connection_error
        
        # When: Creating typed error from generic exception
        classifier = ErrorClassifier(
            status_analyzer=self.mock_status_analyzer,
            error_factory=mock_error_factory
        )
        
        connection_exception = ConnectionError("Network unreachable")
        typed_error = classifier.create_typed_error(connection_exception)
        
        # Then: Should create appropriate error type
        mock_error_factory.create_connection_error.assert_called_with(connection_exception)
        assert typed_error == mock_connection_error


class TestErrorReporter:
    """Test error reporting and observability behavior."""

    def setup_method(self):
        self.mock_metrics_collector = Mock()
        self.mock_logger = Mock()
        self.mock_alerting = Mock()

    def test_should_report_error_metrics_to_collector(self):
        """Test that error reporter coordinates with metrics collection."""
        # Given: Error reporter with metrics collector
        reporter = ErrorReporter(
            metrics_collector=self.mock_metrics_collector,
            logger=self.mock_logger
        )
        
        # When: Reporting an error
        error = WeaviateBatchError("Batch failed", batch_size=100)
        reporter.report(error)
        
        # Then: Should send metrics
        self.mock_metrics_collector.increment_error_count.assert_called_with(
            error_type="WeaviateBatchError",
            operation=error.operation
        )

    def test_should_trigger_alerts_for_critical_errors(self):
        """Test that reporter coordinates with alerting system."""
        # Given: Critical error threshold
        self.mock_alerting.should_alert.return_value = True
        
        reporter = ErrorReporter(
            metrics_collector=self.mock_metrics_collector,
            logger=self.mock_logger,
            alerting=self.mock_alerting
        )
        
        # When: Reporting critical error
        critical_error = WeaviatePermanentError("Schema corruption detected")
        reporter.report(critical_error)
        
        # Then: Should trigger alert
        self.mock_alerting.should_alert.assert_called_with(critical_error)
        self.mock_alerting.send_alert.assert_called_once()

    def test_should_aggregate_error_patterns_for_analysis(self):
        """Test that reporter aggregates errors for pattern analysis."""
        # Given: Pattern analyzer mock
        mock_pattern_analyzer = Mock()
        
        reporter = ErrorReporter(
            metrics_collector=self.mock_metrics_collector,
            pattern_analyzer=mock_pattern_analyzer
        )
        
        # When: Reporting multiple related errors
        errors = [
            WeaviateConnectionError("Connection failed", endpoint="host1"),
            WeaviateConnectionError("Connection failed", endpoint="host1"),
            WeaviateConnectionError("Connection failed", endpoint="host2"),
        ]
        
        for error in errors:
            reporter.report(error)
        
        # Then: Should analyze error patterns
        assert mock_pattern_analyzer.add_error.call_count == 3
        mock_pattern_analyzer.analyze_patterns.assert_called()


class TestCircuitBreakerIntegration:
    """Test circuit breaker integration with error handling."""

    def test_should_coordinate_with_circuit_breaker_on_errors(self):
        """Test that errors coordinate with circuit breaker state."""
        # Given: Circuit breaker mock
        mock_circuit_breaker = Mock()
        mock_circuit_breaker.should_allow_request.return_value = False
        
        # When: Creating circuit breaker error
        error = WeaviateCircuitBreakerError(
            message="Circuit breaker open",
            circuit_breaker_state="OPEN",
            circuit_breaker=mock_circuit_breaker
        )
        
        # Then: Should indicate circuit breaker state
        assert error.circuit_breaker_state == "OPEN"
        assert error.is_retryable is False  # Circuit breaker errors shouldn't retry immediately

    def test_should_update_circuit_breaker_on_error_reporting(self):
        """Test that error reporting updates circuit breaker state."""
        # Given: Circuit breaker that tracks failures
        mock_circuit_breaker = Mock()
        
        reporter = ErrorReporter(
            metrics_collector=Mock(),
            circuit_breaker=mock_circuit_breaker
        )
        
        # When: Reporting consecutive failures
        connection_error = WeaviateConnectionError("Connection failed")
        reporter.report(connection_error)
        
        # Then: Should notify circuit breaker of failure
        mock_circuit_breaker.record_failure.assert_called_with(connection_error)


class TestErrorRecoveryContracts:
    """Test error recovery behavior contracts using mocks."""

    def test_should_define_recovery_strategy_interface(self):
        """Test that errors define recovery strategy contracts."""
        # Given: Recovery strategy mock
        mock_recovery_strategy = Mock()
        mock_recovery_strategy.can_recover.return_value = True
        mock_recovery_strategy.attempt_recovery.return_value = True
        
        # When: Creating recoverable error
        error = WeaviateRetryableError(
            "Temporary network issue",
            recovery_strategy=mock_recovery_strategy
        )
        
        # Then: Should coordinate with recovery strategy
        can_recover = error.can_attempt_recovery()
        recovery_result = error.attempt_recovery()
        
        mock_recovery_strategy.can_recover.assert_called_once()
        mock_recovery_strategy.attempt_recovery.assert_called_once()
        assert can_recover is True
        assert recovery_result is True

    def test_should_coordinate_error_context_with_swarm_agents(self):
        """Test that errors share context with other swarm agents."""
        # Given: Swarm coordinator mock
        mock_swarm_coordinator = Mock()
        
        # When: Creating error with swarm context
        error = WeaviateBatchError(
            "Batch operation failed",
            batch_size=100,
            swarm_coordinator=mock_swarm_coordinator
        )
        
        error.share_with_swarm()
        
        # Then: Should share error context with swarm
        mock_swarm_coordinator.share_error_context.assert_called_with(error)