"""Exception hierarchy for Weaviate operations.

This module provides comprehensive error handling following TDD London School principles,
with emphasis on error classification, recovery strategies, and observability.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol
from abc import ABC, abstractmethod


class WeaviateError(Exception):
    """Base exception for all Weaviate-related errors.
    
    Captures operation context and provides foundation for error handling patterns.
    """
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.operation = operation
        self.details = details or {}
        self.timestamp = datetime.now()
    
    @property
    def is_retryable(self) -> bool:
        """Default retry behavior - subclasses should override."""
        return False


class WeaviateRetryableError(WeaviateError):
    """Base class for errors that can be retried.
    
    Coordinates with recovery strategies and retry mechanisms.
    """
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        recovery_strategy: Optional['RecoveryStrategy'] = None
    ):
        super().__init__(message, operation, details)
        self._recovery_strategy = recovery_strategy
    
    @property
    def is_retryable(self) -> bool:
        """Retryable errors can be retried."""
        return True
    
    def can_attempt_recovery(self) -> bool:
        """Check if recovery can be attempted."""
        if self._recovery_strategy:
            return self._recovery_strategy.can_recover()
        return False
    
    def attempt_recovery(self) -> bool:
        """Attempt to recover from error."""
        if self._recovery_strategy:
            return self._recovery_strategy.attempt_recovery()
        return False


class WeaviatePermanentError(WeaviateError):
    """Base class for permanent errors that should not be retried."""
    
    @property
    def is_retryable(self) -> bool:
        """Permanent errors should not be retried."""
        return False


class WeaviateConnectionError(WeaviateRetryableError):
    """Error for connection-related failures.
    
    Captures connection context and coordinates with connection management.
    """
    
    def __init__(
        self,
        message: str,
        endpoint: Optional[str] = None,
        timeout: Optional[int] = None,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, operation, details)
        self.endpoint = endpoint
        self.timeout = timeout


class WeaviateBatchError(WeaviateRetryableError):
    """Error for batch operation failures.
    
    Captures batch operation context and provides detailed failure information.
    """
    
    def __init__(
        self,
        message: str,
        batch_size: Optional[int] = None,
        failed_items: Optional[List[int]] = None,
        collection_name: Optional[str] = None,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        swarm_coordinator: Optional['SwarmCoordinator'] = None
    ):
        super().__init__(message, operation, details)
        self.batch_size = batch_size
        self.failed_items = failed_items or []
        self.collection_name = collection_name
        self._swarm_coordinator = swarm_coordinator
    
    @property
    def success_count(self) -> int:
        """Calculate number of successful items in batch."""
        if self.batch_size is None:
            return 0
        return self.batch_size - len(self.failed_items)
    
    def share_with_swarm(self) -> None:
        """Share error context with swarm agents."""
        if self._swarm_coordinator:
            self._swarm_coordinator.share_error_context(self)


class WeaviateTimeoutError(WeaviateRetryableError):
    """Error for timeout-related failures."""
    
    def __init__(
        self,
        message: str,
        timeout_duration: Optional[float] = None,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, operation, details)
        self.timeout_duration = timeout_duration


class WeaviateCircuitBreakerError(WeaviateError):
    """Error when circuit breaker is open.
    
    Coordinates with circuit breaker state management.
    """
    
    def __init__(
        self,
        message: str,
        circuit_breaker_state: str,
        circuit_breaker: Optional['CircuitBreaker'] = None,
        operation: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, operation, details)
        self.circuit_breaker_state = circuit_breaker_state
        self._circuit_breaker = circuit_breaker
    
    @property
    def is_retryable(self) -> bool:
        """Circuit breaker errors should not be retried immediately."""
        return False


# Protocols for dependency injection and testing
class StatusAnalyzer(Protocol):
    """Protocol for analyzing HTTP status codes."""
    
    def extract_status(self, exception: Exception) -> Optional[int]:
        """Extract status code from exception."""
        ...
    
    def is_retryable_status(self, status_code: int) -> bool:
        """Check if status code indicates retryable error."""
        ...


class MessageAnalyzer(Protocol):
    """Protocol for analyzing error messages."""
    
    def contains_timeout_indicator(self, message: str) -> bool:
        """Check if message indicates timeout error."""
        ...


class ErrorFactory(Protocol):
    """Protocol for creating typed errors."""
    
    def create_connection_error(self, exception: Exception) -> WeaviateConnectionError:
        """Create connection error from generic exception."""
        ...


class MetricsCollector(Protocol):
    """Protocol for metrics collection."""
    
    def increment_error_count(self, error_type: str, operation: Optional[str] = None) -> None:
        """Increment error count metrics."""
        ...


class Logger(Protocol):
    """Protocol for logging."""
    
    def error(self, message: str, **kwargs: Any) -> None:
        """Log error message."""
        ...


class Alerting(Protocol):
    """Protocol for alerting system."""
    
    def should_alert(self, error: WeaviateError) -> bool:
        """Check if error should trigger alert."""
        ...
    
    def send_alert(self) -> None:
        """Send alert notification."""
        ...


class PatternAnalyzer(Protocol):
    """Protocol for error pattern analysis."""
    
    def add_error(self, error: WeaviateError) -> None:
        """Add error to pattern analysis."""
        ...
    
    def analyze_patterns(self) -> None:
        """Analyze error patterns."""
        ...


class CircuitBreaker(Protocol):
    """Protocol for circuit breaker functionality."""
    
    def should_allow_request(self) -> bool:
        """Check if request should be allowed."""
        ...
    
    def record_failure(self, error: WeaviateError) -> None:
        """Record failure for circuit breaker logic."""
        ...


class RecoveryStrategy(Protocol):
    """Protocol for error recovery strategies."""
    
    def can_recover(self) -> bool:
        """Check if recovery is possible."""
        ...
    
    def attempt_recovery(self) -> bool:
        """Attempt to recover from error."""
        ...


class SwarmCoordinator(Protocol):
    """Protocol for swarm coordination."""
    
    def share_error_context(self, error: WeaviateError) -> None:
        """Share error context with swarm agents."""
        ...


class ErrorClassifier:
    """Classifies errors and creates appropriate error types.
    
    Coordinates with multiple analyzers to determine error characteristics.
    """
    
    def __init__(
        self,
        status_analyzer: Optional[StatusAnalyzer] = None,
        message_analyzer: Optional[MessageAnalyzer] = None,
        error_factory: Optional[ErrorFactory] = None
    ):
        self._status_analyzer = status_analyzer
        self._message_analyzer = message_analyzer
        self._error_factory = error_factory
    
    def is_retryable(self, exception: Exception) -> bool:
        """Determine if exception represents retryable error."""
        # Check HTTP status codes
        if self._status_analyzer:
            status = self._status_analyzer.extract_status(exception)
            if status:
                return self._status_analyzer.is_retryable_status(status)
        
        # Check for timeout indicators
        if self._message_analyzer:
            message = str(exception)
            if self._message_analyzer.contains_timeout_indicator(message):
                return True
        
        # Check exception type
        if isinstance(exception, (TimeoutError, ConnectionError)):
            return True
        
        return False
    
    def create_typed_error(self, exception: Exception) -> WeaviateError:
        """Create appropriate Weaviate error type from generic exception."""
        if self._error_factory and isinstance(exception, ConnectionError):
            return self._error_factory.create_connection_error(exception)
        
        # Default fallback
        if self.is_retryable(exception):
            return WeaviateRetryableError(str(exception))
        else:
            return WeaviatePermanentError(str(exception))


class ErrorReporter:
    """Reports errors and coordinates with observability systems.
    
    Follows London School pattern by coordinating with multiple collaborators.
    """
    
    def __init__(
        self,
        metrics_collector: Optional[MetricsCollector] = None,
        logger: Optional[Logger] = None,
        alerting: Optional[Alerting] = None,
        pattern_analyzer: Optional[PatternAnalyzer] = None,
        circuit_breaker: Optional[CircuitBreaker] = None
    ):
        self._metrics_collector = metrics_collector
        self._logger = logger
        self._alerting = alerting
        self._pattern_analyzer = pattern_analyzer
        self._circuit_breaker = circuit_breaker
    
    def report(self, error: WeaviateError) -> None:
        """Report error to all configured systems."""
        # Collect metrics
        if self._metrics_collector:
            self._metrics_collector.increment_error_count(
                error_type=type(error).__name__,
                operation=error.operation
            )
        
        # Log error
        if self._logger:
            self._logger.error(
                f"Weaviate error: {error}",
                operation=error.operation,
                details=error.details
            )
        
        # Check for alerting
        if self._alerting and self._alerting.should_alert(error):
            self._alerting.send_alert()
        
        # Add to pattern analysis
        if self._pattern_analyzer:
            self._pattern_analyzer.add_error(error)
            self._pattern_analyzer.analyze_patterns()
        
        # Update circuit breaker
        if self._circuit_breaker:
            self._circuit_breaker.record_failure(error)