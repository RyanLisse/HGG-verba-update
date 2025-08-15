"""Test Weaviate Configuration Classes using TDD London School methodology.

This module tests the behavior and contracts of configuration classes,
focusing on mock-driven development and contract verification.
"""

import pytest
from unittest.mock import Mock, patch
import os
from goldenverba.components.config import (
    WeaviateBatchConfiguration,
    WeaviateConnectionConfiguration,
    WeaviateRetryConfiguration,
    ConfigurationError,
    ValidationError,
)


class TestWeaviateBatchConfiguration:
    """Test behavior of WeaviateBatchConfiguration using London School TDD.
    
    Focus on contract verification and mock interactions rather than state.
    """

    def setup_method(self):
        """Setup mocks for each test method."""
        self.mock_env_reader = Mock()
        self.mock_validator = Mock()

    def test_should_configure_batch_size_from_environment(self):
        """Test that batch configuration reads from environment variables."""
        # Given: Environment has batch size configuration
        self.mock_env_reader.get.return_value = "500"
        
        # When: Creating batch configuration
        config = WeaviateBatchConfiguration(env_reader=self.mock_env_reader)
        
        # Then: Should read from correct environment variable
        self.mock_env_reader.get.assert_called_with("VERBA_WV_INSERT_BATCH", "1000")
        assert config.batch_size == 500

    def test_should_configure_concurrency_from_environment(self):
        """Test that concurrency configuration reads from environment variables."""
        # Given: Environment has concurrency configuration
        self.mock_env_reader.get.side_effect = lambda key, default: {
            "VERBA_WV_INSERT_BATCH": "1000",
            "VERBA_EMBED_CONCURRENCY": "8"
        }.get(key, default)
        
        # When: Creating batch configuration
        config = WeaviateBatchConfiguration(env_reader=self.mock_env_reader)
        
        # Then: Should read concurrency setting
        self.mock_env_reader.get.assert_any_call("VERBA_EMBED_CONCURRENCY", "4")
        assert config.concurrency_limit == 8

    def test_should_validate_batch_size_constraints(self):
        """Test that configuration validates batch size constraints."""
        # Given: Environment provides invalid batch size
        self.mock_env_reader.get.return_value = "0"
        self.mock_validator.validate_positive_integer.side_effect = ValidationError("Batch size must be positive")
        
        # When/Then: Should raise validation error
        with pytest.raises(ValidationError, match="Batch size must be positive"):
            WeaviateBatchConfiguration(
                env_reader=self.mock_env_reader,
                validator=self.mock_validator
            )

    def test_should_apply_default_values_when_environment_empty(self):
        """Test that configuration applies sensible defaults."""
        # Given: Environment is empty
        self.mock_env_reader.get.side_effect = lambda key, default: default
        
        # When: Creating configuration with defaults
        config = WeaviateBatchConfiguration(env_reader=self.mock_env_reader)
        
        # Then: Should use default values
        assert config.batch_size == 1000
        assert config.concurrency_limit == 4
        assert config.max_retries == 5
        assert config.base_delay == 0.5

    def test_should_coordinate_with_metrics_collector(self):
        """Test that configuration coordinates with metrics collection."""
        # Given: Metrics collector mock
        mock_metrics = Mock()
        
        # When: Creating configuration with metrics
        config = WeaviateBatchConfiguration(
            env_reader=self.mock_env_reader,
            metrics_collector=mock_metrics
        )
        
        # Then: Should register configuration metrics
        mock_metrics.register_config.assert_called_once_with(config)


class TestWeaviateConnectionConfiguration:
    """Test connection configuration behavior and contracts."""

    def setup_method(self):
        self.mock_env_reader = Mock()
        self.mock_timeout_factory = Mock()

    def test_should_configure_timeout_settings(self):
        """Test that connection configuration sets up proper timeouts."""
        # Given: Timeout factory creates timeout objects
        mock_timeout = Mock()
        self.mock_timeout_factory.create_timeout.return_value = mock_timeout
        
        # When: Creating connection configuration
        config = WeaviateConnectionConfiguration(
            env_reader=self.mock_env_reader,
            timeout_factory=self.mock_timeout_factory
        )
        
        # Then: Should create timeout with correct parameters
        self.mock_timeout_factory.create_timeout.assert_called_with(
            init=60, query=300, insert=300
        )
        assert config.timeout == mock_timeout

    def test_should_coordinate_with_health_checker(self):
        """Test that connection config works with health checking."""
        # Given: Health checker mock
        mock_health_checker = Mock()
        
        # When: Creating configuration with health checker
        config = WeaviateConnectionConfiguration(
            env_reader=self.mock_env_reader,
            health_checker=mock_health_checker
        )
        
        # Then: Should configure health checking
        mock_health_checker.configure.assert_called_once_with(config)


class TestWeaviateRetryConfiguration:
    """Test retry configuration behavior using mock-driven approach."""

    def setup_method(self):
        self.mock_backoff_strategy = Mock()
        self.mock_circuit_breaker = Mock()

    def test_should_collaborate_with_backoff_strategy(self):
        """Test that retry config coordinates with backoff strategy."""
        # Given: Backoff strategy mock
        self.mock_backoff_strategy.calculate_delay.return_value = 2.5
        
        # When: Creating retry configuration
        config = WeaviateRetryConfiguration(
            max_attempts=5,
            backoff_strategy=self.mock_backoff_strategy
        )
        
        # Then: Should use backoff strategy for delay calculation
        delay = config.calculate_delay(attempt=3)
        self.mock_backoff_strategy.calculate_delay.assert_called_with(
            attempt=3, base_delay=0.5
        )
        assert delay == 2.5

    def test_should_coordinate_with_circuit_breaker(self):
        """Test interaction with circuit breaker pattern."""
        # Given: Circuit breaker mock
        self.mock_circuit_breaker.should_attempt.return_value = True
        
        # When: Checking if should retry
        config = WeaviateRetryConfiguration(
            max_attempts=5,
            circuit_breaker=self.mock_circuit_breaker
        )
        
        should_retry = config.should_retry(attempt=2, exception=Exception("test"))
        
        # Then: Should consult circuit breaker
        self.mock_circuit_breaker.should_attempt.assert_called_once()
        assert should_retry is True

    def test_should_handle_transient_vs_permanent_errors(self):
        """Test that retry logic distinguishes error types."""
        # Given: Error classifier mock
        mock_classifier = Mock()
        mock_classifier.is_transient.return_value = False
        
        # When: Checking retry for permanent error
        config = WeaviateRetryConfiguration(
            max_attempts=5,
            error_classifier=mock_classifier
        )
        
        permanent_error = Exception("Permanent failure")
        should_retry = config.should_retry(attempt=1, exception=permanent_error)
        
        # Then: Should not retry permanent errors
        mock_classifier.is_transient.assert_called_with(permanent_error)
        assert should_retry is False


class TestConfigurationIntegration:
    """Test configuration classes working together in swarm patterns."""

    def test_should_coordinate_configuration_loading(self):
        """Test that configuration loader coordinates multiple configs."""
        # Given: Multiple configuration mocks
        mock_batch_config = Mock()
        mock_connection_config = Mock()
        mock_retry_config = Mock()
        mock_config_factory = Mock()
        
        mock_config_factory.create_batch_config.return_value = mock_batch_config
        mock_config_factory.create_connection_config.return_value = mock_connection_config
        mock_config_factory.create_retry_config.return_value = mock_retry_config
        
        # When: Loading complete configuration
        from goldenverba.components.config import ConfigurationLoader
        loader = ConfigurationLoader(config_factory=mock_config_factory)
        config_bundle = loader.load_all()
        
        # Then: Should create all required configurations
        mock_config_factory.create_batch_config.assert_called_once()
        mock_config_factory.create_connection_config.assert_called_once()
        mock_config_factory.create_retry_config.assert_called_once()
        
        assert config_bundle.batch_config == mock_batch_config
        assert config_bundle.connection_config == mock_connection_config
        assert config_bundle.retry_config == mock_retry_config

    def test_should_validate_configuration_compatibility(self):
        """Test that configurations validate compatibility with each other."""
        # Given: Configuration validator mock
        mock_validator = Mock()
        mock_validator.validate_compatibility.return_value = True
        
        # When: Validating configuration bundle
        from goldenverba.components.config import ConfigurationValidator
        validator = ConfigurationValidator(compatibility_checker=mock_validator)
        
        mock_bundle = Mock()
        is_valid = validator.validate(mock_bundle)
        
        # Then: Should check configuration compatibility
        mock_validator.validate_compatibility.assert_called_with(mock_bundle)
        assert is_valid is True