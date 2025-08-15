"""Configuration classes for Weaviate operations.

This module provides configuration management following TDD London School principles,
with emphasis on contracts and collaborations between objects.
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol
from datetime import datetime


class ConfigurationError(Exception):
    """Base exception for configuration errors."""
    pass


class ValidationError(ConfigurationError):
    """Exception for configuration validation errors."""
    pass


class EnvironmentReader(Protocol):
    """Protocol for environment variable readers."""
    
    def get(self, key: str, default: str) -> str:
        """Get environment variable value with default."""
        ...


class Validator(Protocol):
    """Protocol for configuration validators."""
    
    def validate_positive_integer(self, value: str, name: str) -> int:
        """Validate that value is a positive integer."""
        ...


class MetricsCollector(Protocol):
    """Protocol for metrics collection."""
    
    def register_config(self, config: Any) -> None:
        """Register configuration for metrics collection."""
        ...


class TimeoutFactory(Protocol):
    """Protocol for creating timeout configurations."""
    
    def create_timeout(self, init: int, query: int, insert: int) -> Any:
        """Create timeout configuration object."""
        ...


class HealthChecker(Protocol):
    """Protocol for health checking."""
    
    def configure(self, config: Any) -> None:
        """Configure health checking."""
        ...


class BackoffStrategy(Protocol):
    """Protocol for backoff delay calculation."""
    
    def calculate_delay(self, attempt: int, base_delay: float) -> float:
        """Calculate backoff delay for retry attempt."""
        ...


class CircuitBreaker(Protocol):
    """Protocol for circuit breaker pattern."""
    
    def should_attempt(self) -> bool:
        """Check if operation should be attempted."""
        ...


class ErrorClassifier(Protocol):
    """Protocol for error classification."""
    
    def is_transient(self, exception: Exception) -> bool:
        """Check if exception is transient (retryable)."""
        ...


@dataclass
class WeaviateBatchConfiguration:
    """Configuration for Weaviate batch operations.
    
    This class encapsulates batch processing settings and coordinates
    with metrics collection and validation systems.
    """
    
    def __init__(
        self,
        env_reader: Optional[EnvironmentReader] = None,
        validator: Optional[Validator] = None,
        metrics_collector: Optional[MetricsCollector] = None
    ):
        self._env_reader = env_reader or DefaultEnvironmentReader()
        self._validator = validator or DefaultValidator()
        self._metrics_collector = metrics_collector
        
        # Load configuration from environment
        batch_size_str = self._env_reader.get("VERBA_WV_INSERT_BATCH", "1000")
        concurrency_str = self._env_reader.get("VERBA_EMBED_CONCURRENCY", "4")
        max_retries_str = self._env_reader.get("VERBA_WV_MAX_RETRIES", "5")
        base_delay_str = self._env_reader.get("VERBA_WV_BASE_DELAY", "0.5")
        
        # Validate and set configuration
        if self._validator:
            self.batch_size = self._validator.validate_positive_integer(batch_size_str, "batch_size")
            self.concurrency_limit = self._validator.validate_positive_integer(concurrency_str, "concurrency_limit")
            self.max_retries = self._validator.validate_positive_integer(max_retries_str, "max_retries")
        else:
            self.batch_size = int(batch_size_str)
            self.concurrency_limit = int(concurrency_str)
            self.max_retries = int(max_retries_str)
        
        self.base_delay = float(base_delay_str)
        
        # Register with metrics collector
        if self._metrics_collector:
            self._metrics_collector.register_config(self)


@dataclass
class WeaviateConnectionConfiguration:
    """Configuration for Weaviate connections.
    
    Coordinates with timeout factories and health checkers.
    """
    
    def __init__(
        self,
        env_reader: Optional[EnvironmentReader] = None,
        timeout_factory: Optional[TimeoutFactory] = None,
        health_checker: Optional[HealthChecker] = None
    ):
        self._env_reader = env_reader or DefaultEnvironmentReader()
        self._timeout_factory = timeout_factory
        self._health_checker = health_checker
        
        # Configure timeouts
        if self._timeout_factory:
            self.timeout = self._timeout_factory.create_timeout(
                init=60, query=300, insert=300
            )
        else:
            self.timeout = None
        
        # Configure health checking
        if self._health_checker:
            self._health_checker.configure(self)


@dataclass
class WeaviateRetryConfiguration:
    """Configuration for retry logic and circuit breaking.
    
    Coordinates with backoff strategies and circuit breakers.
    """
    
    def __init__(
        self,
        max_attempts: int = 5,
        base_delay: float = 0.5,
        backoff_strategy: Optional[BackoffStrategy] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
        error_classifier: Optional[ErrorClassifier] = None
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self._backoff_strategy = backoff_strategy
        self._circuit_breaker = circuit_breaker
        self._error_classifier = error_classifier
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt."""
        if self._backoff_strategy:
            return self._backoff_strategy.calculate_delay(attempt, self.base_delay)
        return self.base_delay * (2 ** (attempt - 1))
    
    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """Determine if operation should be retried."""
        if attempt >= self.max_attempts:
            return False
        
        # Check circuit breaker
        if self._circuit_breaker and not self._circuit_breaker.should_attempt():
            return False
        
        # Check if error is transient
        if self._error_classifier and not self._error_classifier.is_transient(exception):
            return False
        
        return True


@dataclass
class ConfigurationBundle:
    """Bundle of all configuration objects."""
    batch_config: WeaviateBatchConfiguration
    connection_config: WeaviateConnectionConfiguration
    retry_config: WeaviateRetryConfiguration


class ConfigurationFactory:
    """Factory for creating configuration objects."""
    
    def __init__(
        self,
        env_reader: Optional[EnvironmentReader] = None,
        validator: Optional[Validator] = None,
        metrics_collector: Optional[MetricsCollector] = None
    ):
        self._env_reader = env_reader or DefaultEnvironmentReader()
        self._validator = validator or DefaultValidator()
        self._metrics_collector = metrics_collector
    
    def create_batch_config(self) -> WeaviateBatchConfiguration:
        """Create batch configuration."""
        return WeaviateBatchConfiguration(
            env_reader=self._env_reader,
            validator=self._validator,
            metrics_collector=self._metrics_collector
        )
    
    def create_connection_config(self) -> WeaviateConnectionConfiguration:
        """Create connection configuration."""
        return WeaviateConnectionConfiguration(env_reader=self._env_reader)
    
    def create_retry_config(self) -> WeaviateRetryConfiguration:
        """Create retry configuration."""
        return WeaviateRetryConfiguration()


class ConfigurationLoader:
    """Loads and coordinates all configuration objects."""
    
    def __init__(self, config_factory: Optional[ConfigurationFactory] = None):
        self._config_factory = config_factory or ConfigurationFactory()
    
    def load_all(self) -> ConfigurationBundle:
        """Load all configuration objects."""
        return ConfigurationBundle(
            batch_config=self._config_factory.create_batch_config(),
            connection_config=self._config_factory.create_connection_config(),
            retry_config=self._config_factory.create_retry_config()
        )


class ConfigurationValidator:
    """Validates configuration compatibility."""
    
    def __init__(self, compatibility_checker: Optional[Any] = None):
        self._compatibility_checker = compatibility_checker
    
    def validate(self, config_bundle: ConfigurationBundle) -> bool:
        """Validate configuration bundle."""
        if self._compatibility_checker:
            return self._compatibility_checker.validate_compatibility(config_bundle)
        return True


# Default implementations
class DefaultEnvironmentReader:
    """Default implementation of environment reader."""
    
    def get(self, key: str, default: str) -> str:
        """Get environment variable with default."""
        return os.getenv(key, default)


class DefaultValidator:
    """Default implementation of validator."""
    
    def validate_positive_integer(self, value: str, name: str) -> int:
        """Validate positive integer value."""
        try:
            int_value = int(value)
            if int_value <= 0:
                raise ValidationError(f"{name} must be positive")
            return int_value
        except ValueError:
            raise ValidationError(f"{name} must be a valid integer")