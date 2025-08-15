"""Enhanced retry logic for Weaviate operations.

This module provides comprehensive retry mechanisms following TDD London School principles,
with emphasis on resilience, coordination, and adaptive strategies.
"""

import asyncio
import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Protocol

from .exceptions import WeaviateError, WeaviatePermanentError


class ErrorClassifier(Protocol):
    """Protocol for error classification."""
    
    def is_retryable(self, exception: Exception) -> bool:
        """Check if exception is retryable."""
        ...


class CircuitBreaker(Protocol):
    """Protocol for circuit breaker integration."""
    
    def should_allow_request(self) -> bool:
        """Check if request should be allowed."""
        ...
    
    def record_failure(self, error: Exception) -> None:
        """Record failure for circuit breaker logic."""
        ...


class BackoffCalculator(Protocol):
    """Protocol for backoff delay calculation."""
    
    def calculate_delay(self, attempt: int, base_delay: float) -> float:
        """Calculate delay for retry attempt."""
        ...
    
    def add_jitter(self, delay: float) -> float:
        """Add jitter to delay for distributed systems."""
        ...


class MetricsCollector(Protocol):
    """Protocol for retry metrics collection."""
    
    def record_retry_attempt(
        self, 
        attempt: int, 
        error_type: str, 
        delay: float
    ) -> None:
        """Record retry attempt metrics."""
        ...
    
    def record_retry_sequence(self) -> None:
        """Record retry sequence metrics."""
        ...
    
    def record_success_after_retries(
        self, 
        attempts: int, 
        total_delay: float
    ) -> None:
        """Record successful operation after retries."""
        ...


class OperationRegistry(Protocol):
    """Protocol for operation registry."""
    
    def get_operations(self, sequence_name: str) -> Dict[str, Callable]:
        """Get operations for a sequence."""
        ...


class DistributedCoordinator(Protocol):
    """Protocol for distributed retry coordination."""
    
    def should_coordinate_retry(self, service: str, operation: str) -> bool:
        """Check if should coordinate retry across services."""
        ...
    
    def get_distributed_delay(self) -> float:
        """Get distributed retry delay."""
        ...


class SwarmCoordinator(Protocol):
    """Protocol for swarm coordination."""
    
    def broadcast_retry_context(self, context: Dict[str, Any]) -> None:
        """Broadcast retry context to swarm."""
        ...
    
    def get_swarm_retry_patterns(self) -> List[Dict[str, Any]]:
        """Get retry patterns from swarm members."""
        ...


class ConditionEvaluator(Protocol):
    """Protocol for condition evaluation."""
    
    def should_use_fast_retry(self) -> bool:
        """Check if should use fast retry."""
        ...


class LearningEngine(Protocol):
    """Protocol for adaptive learning."""
    
    def get_optimal_delay(self) -> float:
        """Get optimal delay based on learning."""
        ...


class PatternAnalyzer(Protocol):
    """Protocol for pattern analysis."""
    
    def analyze_error_patterns(self) -> Dict[str, Any]:
        """Analyze error patterns for recommendations."""
        ...


@dataclass
class RetryResult:
    """Result of retry operation with comprehensive metrics."""
    
    success: bool
    final_result: Any = None
    total_attempts: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error_history: List[Dict[str, Any]] = field(default_factory=list)
    pattern_analyzer: Optional[PatternAnalyzer] = None
    
    @property
    def total_duration(self) -> timedelta:
        """Calculate total duration of retry operation."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return timedelta()
    
    @property
    def total_delay(self) -> float:
        """Calculate total delay from all retry attempts."""
        return sum(error.get("delay", 0.0) for error in self.error_history)
    
    def calculate_efficiency_score(self) -> float:
        """Calculate efficiency score of retry operation."""
        if not self.success or self.total_attempts <= 1:
            return 0.0 if not self.success else 1.0
        
        # Higher efficiency for fewer attempts and shorter delays
        attempts_factor = 1.0 / self.total_attempts
        delay_factor = 1.0 / (1.0 + self.total_delay)
        
        return (attempts_factor + delay_factor) / 2.0
    
    def estimate_success_probability(self) -> float:
        """Estimate success probability based on retry pattern."""
        if self.total_attempts == 0:
            return 0.0
        
        # Simple estimation based on success and attempt count
        if self.success:
            return max(0.1, 1.0 - (self.total_attempts - 1) * 0.2)
        else:
            return max(0.0, 0.5 - self.total_attempts * 0.1)
    
    def get_retry_recommendations(self) -> Dict[str, Any]:
        """Get recommendations for future retry strategies."""
        if self.pattern_analyzer:
            return self.pattern_analyzer.analyze_error_patterns()
        
        # Default recommendations
        return {
            "recommended_strategy": "exponential_backoff",
            "suggested_max_attempts": min(5, self.total_attempts + 1),
            "base_delay": 1.0
        }


class RetryPolicy:
    """Retry policy that coordinates with multiple systems.
    
    Determines retry eligibility and timing based on various factors.
    """
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        error_classifier: Optional[ErrorClassifier] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
        backoff_calculator: Optional[BackoffCalculator] = None,
        metrics_collector: Optional[MetricsCollector] = None
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self._error_classifier = error_classifier or DefaultErrorClassifier()
        self._circuit_breaker = circuit_breaker
        self._backoff_calculator = backoff_calculator or DefaultBackoffCalculator()
        self._metrics_collector = metrics_collector
    
    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """Determine if operation should be retried."""
        # Check maximum attempts
        if attempt >= self.max_attempts:
            return False
        
        # Check error type
        if not self._error_classifier.is_retryable(exception):
            return False
        
        # Check circuit breaker
        if self._circuit_breaker and not self._circuit_breaker.should_allow_request():
            return False
        
        return True
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt."""
        delay = self._backoff_calculator.calculate_delay(attempt, self.base_delay)
        return self._backoff_calculator.add_jitter(delay)
    
    def record_retry_attempt(
        self, 
        attempt: int, 
        exception: Exception, 
        delay: float
    ) -> None:
        """Record retry attempt for metrics."""
        if self._metrics_collector:
            self._metrics_collector.record_retry_attempt(
                attempt=attempt,
                error_type=type(exception).__name__,
                delay=delay
            )


class RetryStrategy:
    """Factory for different retry strategies."""
    
    @staticmethod
    def exponential_backoff(
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0
    ) -> 'ExponentialBackoffStrategy':
        """Create exponential backoff strategy."""
        return ExponentialBackoffStrategy(base_delay, max_delay, multiplier)
    
    @staticmethod
    def linear_backoff(
        base_delay: float = 1.0,
        increment: float = 1.0
    ) -> 'LinearBackoffStrategy':
        """Create linear backoff strategy."""
        return LinearBackoffStrategy(base_delay, increment)
    
    @staticmethod
    def custom(
        condition_evaluator: Optional[ConditionEvaluator] = None
    ) -> 'CustomRetryStrategy':
        """Create custom retry strategy."""
        return CustomRetryStrategy(condition_evaluator)
    
    @staticmethod
    def adaptive(
        learning_engine: Optional[LearningEngine] = None
    ) -> 'AdaptiveRetryStrategy':
        """Create adaptive retry strategy."""
        return AdaptiveRetryStrategy(learning_engine)


class ExponentialBackoffStrategy:
    """Exponential backoff retry strategy."""
    
    def __init__(self, base_delay: float, max_delay: float, multiplier: float):
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay."""
        delay = self.base_delay * (self.multiplier ** (attempt - 1))
        return min(delay, self.max_delay)


class LinearBackoffStrategy:
    """Linear backoff retry strategy."""
    
    def __init__(self, base_delay: float, increment: float):
        self.base_delay = base_delay
        self.increment = increment
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate linear backoff delay."""
        return self.base_delay + (attempt - 1) * self.increment


class CustomRetryStrategy:
    """Custom retry strategy with conditional logic."""
    
    def __init__(self, condition_evaluator: Optional[ConditionEvaluator] = None):
        self._condition_evaluator = condition_evaluator
    
    def calculate_conditional_delay(
        self, 
        attempt: int, 
        error_context: Dict[str, Any]
    ) -> float:
        """Calculate delay based on conditions."""
        base_delay = 1.0
        
        if self._condition_evaluator:
            if self._condition_evaluator.should_use_fast_retry():
                return base_delay * 0.5
        
        # Default conditional logic
        if error_context.get("error_type") == "timeout":
            return base_delay * 0.5
        else:
            return base_delay * 2.0


class AdaptiveRetryStrategy:
    """Adaptive retry strategy that learns from patterns."""
    
    def __init__(self, learning_engine: Optional[LearningEngine] = None):
        self._learning_engine = learning_engine
    
    def get_adaptive_delay(
        self, 
        attempt: int, 
        error_history: List[Dict[str, Any]]
    ) -> float:
        """Get adaptive delay based on learning."""
        if self._learning_engine:
            return self._learning_engine.get_optimal_delay()
        
        # Simple adaptive logic
        successful_delays = [
            h["delay"] for h in error_history 
            if h.get("success", False)
        ]
        
        if successful_delays:
            return sum(successful_delays) / len(successful_delays)
        
        return 1.0


class WeaviateRetryHandler:
    """Weaviate-specific retry handler with comprehensive coordination."""
    
    def __init__(
        self,
        policy: Optional[RetryPolicy] = None,
        metrics_collector: Optional[MetricsCollector] = None,
        circuit_breaker: Optional[CircuitBreaker] = None
    ):
        self._policy = policy or RetryPolicy()
        self._metrics_collector = metrics_collector
        self._circuit_breaker = circuit_breaker
    
    async def execute_with_retry(self, operation: Callable) -> Any:
        """Execute operation with retry logic."""
        attempt = 1
        last_exception = None
        
        while True:
            try:
                if self._circuit_breaker:
                    if not self._circuit_breaker.should_allow_request():
                        raise last_exception or Exception("Circuit breaker open")
                
                result = await operation() if asyncio.iscoroutinefunction(operation) else operation()
                return result
                
            except Exception as e:
                last_exception = e
                
                if self._circuit_breaker:
                    self._circuit_breaker.record_failure(e)
                
                if not self._policy.should_retry(attempt, e):
                    raise e
                
                delay = self._policy.calculate_delay(attempt)
                self._policy.record_retry_attempt(attempt, e, delay)
                
                await asyncio.sleep(delay)
                attempt += 1
    
    async def execute_with_circuit_breaker_coordination(
        self, 
        operation: Callable
    ) -> Any:
        """Execute with circuit breaker coordination."""
        if self._circuit_breaker:
            if not self._circuit_breaker.should_allow_request():
                raise Exception("Circuit breaker prevents execution")
        
        try:
            result = await operation() if asyncio.iscoroutinefunction(operation) else operation()
            return result
        except Exception as e:
            if self._circuit_breaker:
                self._circuit_breaker.record_failure(e)
            raise
    
    async def execute_with_comprehensive_metrics(
        self, 
        operation: Callable
    ) -> Any:
        """Execute with comprehensive metrics collection."""
        start_time = time.time()
        attempt = 1
        total_delay = 0.0
        
        while True:
            try:
                result = await operation() if asyncio.iscoroutinefunction(operation) else operation()
                
                if self._metrics_collector:
                    self._metrics_collector.record_success_after_retries(
                        attempts=attempt,
                        total_delay=total_delay
                    )
                
                return result
                
            except Exception as e:
                if not self._policy.should_retry(attempt, e):
                    raise e
                
                delay = self._policy.calculate_delay(attempt)
                total_delay += delay
                
                if self._metrics_collector and attempt == 1:
                    self._metrics_collector.record_retry_sequence()
                
                await asyncio.sleep(delay)
                attempt += 1
    
    async def execute_batch_with_partial_retry(
        self,
        operation: Callable,
        batch_items: List[Any]
    ) -> Dict[str, Any]:
        """Execute batch operation with partial retry logic."""
        total_successes = 0
        total_failures = 0
        remaining_items = batch_items
        
        while remaining_items:
            try:
                result = await operation(remaining_items) if asyncio.iscoroutinefunction(operation) else operation(remaining_items)
                
                successes = result.get("successes", [])
                failures = result.get("failures", [])
                
                total_successes += len(successes)
                remaining_items = failures
                
                if not remaining_items:
                    break
                    
            except Exception as e:
                if not self._policy.should_retry(1, e):
                    total_failures += len(remaining_items)
                    break
                
                delay = self._policy.calculate_delay(1)
                await asyncio.sleep(delay)
        
        return {
            "total_successes": total_successes,
            "total_failures": total_failures
        }


class RetryCoordinator:
    """Coordinates retries across multiple operations and systems."""
    
    def __init__(
        self,
        operation_registry: Optional[OperationRegistry] = None,
        distributed_coordinator: Optional[DistributedCoordinator] = None,
        swarm_coordinator: Optional[SwarmCoordinator] = None
    ):
        self._operation_registry = operation_registry
        self._distributed_coordinator = distributed_coordinator
        self._swarm_coordinator = swarm_coordinator
    
    async def execute_coordinated_operations(
        self, 
        sequence_name: str
    ) -> Dict[str, Any]:
        """Execute coordinated operations with retry logic."""
        if not self._operation_registry:
            return {}
        
        operations = self._operation_registry.get_operations(sequence_name)
        results = {}
        
        for name, operation in operations.items():
            handler = WeaviateRetryHandler()
            try:
                result = await handler.execute_with_retry(operation)
                results[name] = result
            except Exception as e:
                results[name] = f"Failed: {e}"
        
        return results
    
    def coordinate_distributed_retry(
        self,
        service: str,
        operation: str,
        attempt: int
    ) -> float:
        """Coordinate retry with distributed systems."""
        if self._distributed_coordinator:
            if self._distributed_coordinator.should_coordinate_retry(service, operation):
                return self._distributed_coordinator.get_distributed_delay()
        
        return 1.0
    
    def share_retry_context_with_swarm(self, context: Dict[str, Any]) -> None:
        """Share retry context with swarm agents."""
        if self._swarm_coordinator:
            self._swarm_coordinator.broadcast_retry_context(context)
    
    def get_aggregated_retry_patterns(self) -> Dict[str, Any]:
        """Get aggregated retry patterns from swarm."""
        if not self._swarm_coordinator:
            return {}
        
        patterns = self._swarm_coordinator.get_swarm_retry_patterns()
        
        if not patterns:
            return {}
        
        total_agents = len(patterns)
        avg_success_rate = sum(p["success_rate"] for p in patterns) / total_agents
        avg_attempts = sum(p["avg_attempts"] for p in patterns) / total_agents
        
        return {
            "swarm_avg_success_rate": avg_success_rate,
            "swarm_avg_attempts": avg_attempts,
            "total_agents": total_agents
        }


# Default implementations
class DefaultErrorClassifier:
    """Default error classifier."""
    
    def is_retryable(self, exception: Exception) -> bool:
        """Default retryable check."""
        return not isinstance(exception, WeaviatePermanentError)


class DefaultBackoffCalculator:
    """Default backoff calculator with exponential backoff and jitter."""
    
    def calculate_delay(self, attempt: int, base_delay: float) -> float:
        """Calculate exponential backoff delay."""
        return base_delay * (2 ** (attempt - 1))
    
    def add_jitter(self, delay: float) -> float:
        """Add jitter to delay (±20%)."""
        jitter_range = delay * 0.2
        jitter = random.uniform(-jitter_range, jitter_range)
        return max(0.0, delay + jitter)