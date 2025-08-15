"""Test Enhanced WeaviateManager using TDD London School methodology.

This module tests the enhanced WeaviateManager with new configuration, error handling,
and observability patterns using mock-driven development.
"""

from datetime import datetime
from unittest.mock import Mock

import pytest

from goldenverba.components.config import WeaviateBatchConfiguration
from goldenverba.components.enhanced_weaviate_manager import (
    EnhancedWeaviateManager,
    BatchOperationCoordinator,
    ConnectionManager,
    OperationExecutor,
)
from goldenverba.components.exceptions import (
    WeaviateBatchError,
    WeaviateConnectionError,
    WeaviateRetryableError,
)


class TestEnhancedWeaviateManager:
    """Test enhanced WeaviateManager behavior using contract verification."""

    def setup_method(self):
        self.mock_config = Mock(spec=WeaviateBatchConfiguration)
        self.mock_circuit_breaker = Mock()
        self.mock_metrics_collector = Mock()
        self.mock_retry_handler = Mock()
        self.mock_health_checker = Mock()

    def test_should_initialize_with_comprehensive_configuration(self):
        """Test that manager initializes with all configuration components."""
        # Given: Configuration bundle with all components
        self.mock_config.batch_size = 1000
        self.mock_config.concurrency_limit = 4
        self.mock_config.max_retries = 5
        
        # When: Creating enhanced manager
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            circuit_breaker=self.mock_circuit_breaker,
            metrics_collector=self.mock_metrics_collector,
            retry_handler=self.mock_retry_handler,
            health_checker=self.mock_health_checker
        )
        
        # Then: Should initialize with all components
        assert manager.config == self.mock_config
        assert manager.circuit_breaker == self.mock_circuit_breaker
        assert manager.metrics_collector == self.mock_metrics_collector

    def test_should_coordinate_with_connection_manager(self):
        """Test coordination with connection management."""
        # Given: Connection manager with health checking
        mock_connection_manager = Mock()
        mock_connection_manager.establish_connection.return_value = Mock()
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            connection_manager=mock_connection_manager
        )
        
        # When: Establishing connection
        client = manager.connect_with_resilience("weaviate://localhost:8080")
        
        # Then: Should coordinate with connection manager
        mock_connection_manager.establish_connection.assert_called_once()
        assert client is not None

    def test_should_execute_batch_operations_with_enhanced_error_handling(self):
        """Test batch operations with enhanced error handling and retry logic."""
        # Given: Batch operation that initially fails then succeeds
        mock_document = Mock()
        mock_document.chunks = [Mock() for _ in range(100)]
        
        self.mock_retry_handler.execute_with_retry.side_effect = [
            WeaviateBatchError("Initial batch failure"),
            "success"
        ]
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            retry_handler=self.mock_retry_handler,
            metrics_collector=self.mock_metrics_collector
        )
        
        # When: Importing document with retry logic
        result = manager.import_document_with_resilience(
            client=Mock(),
            document=mock_document,
            embedder="test_embedder"
        )
        
        # Then: Should use retry handler and collect metrics
        self.mock_retry_handler.execute_with_retry.assert_called()
        self.mock_metrics_collector.record_batch_operation.assert_called()
        assert result == "success"

    def test_should_coordinate_with_circuit_breaker_for_operation_protection(self):
        """Test coordination with circuit breaker for operation protection."""
        # Given: Circuit breaker that prevents operations when open
        self.mock_circuit_breaker.should_allow_request.return_value = False
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            circuit_breaker=self.mock_circuit_breaker
        )
        
        # When: Attempting operation with circuit breaker open
        with pytest.raises(Exception, match="Circuit breaker"):
            manager.execute_protected_operation(
                operation_name="batch_insert",
                operation=Mock()
            )
        
        # Then: Should respect circuit breaker state
        self.mock_circuit_breaker.should_allow_request.assert_called_once()

    def test_should_collect_comprehensive_metrics_during_operations(self):
        """Test comprehensive metrics collection during operations."""
        # Given: Manager with metrics collection
        mock_operation = Mock(return_value="operation_result")
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            metrics_collector=self.mock_metrics_collector
        )
        
        # When: Executing operation with metrics
        result = manager.execute_with_metrics(
            operation_name="test_operation",
            operation=mock_operation,
            operation_context={"batch_size": 500}
        )
        
        # Then: Should collect operation metrics
        self.mock_metrics_collector.record_operation_start.assert_called_with(
            "test_operation"
        )
        self.mock_metrics_collector.record_operation_success.assert_called_with(
            "test_operation", duration=pytest.approx(0.0, abs=1.0)
        )
        assert result == "operation_result"

    def test_should_perform_health_checks_before_operations(self):
        """Test health checking before critical operations."""
        # Given: Health checker that reports system health
        self.mock_health_checker.check_system_health.return_value = {
            "is_healthy": True,
            "response_time": 0.1
        }
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            health_checker=self.mock_health_checker
        )
        
        # When: Executing operation with health check
        result = manager.execute_with_health_check(
            operation=Mock(return_value="success"),
            require_healthy=True
        )
        
        # Then: Should check health before execution
        self.mock_health_checker.check_system_health.assert_called_once()
        assert result == "success"

    def test_should_handle_partial_batch_failures_with_recovery(self):
        """Test handling of partial batch failures with recovery strategies."""
        # Given: Batch operation with partial failures
        mock_batch_coordinator = Mock()
        mock_batch_coordinator.execute_with_partial_retry.return_value = {
            "successful_items": 95,
            "failed_items": 5,
            "retry_count": 2
        }
        
        manager = EnhancedWeaviateManager(
            config=self.mock_config,
            batch_coordinator=mock_batch_coordinator
        )
        
        # When: Executing batch with partial failure handling
        result = manager.execute_batch_with_recovery(
            batch_items=list(range(100)),
            operation=Mock()
        )
        
        # Then: Should handle partial failures
        mock_batch_coordinator.execute_with_partial_retry.assert_called_once()
        assert result["successful_items"] == 95
        assert result["failed_items"] == 5


class TestBatchOperationCoordinator:
    """Test batch operation coordination and optimization."""

    def setup_method(self):
        self.mock_config = Mock()
        self.mock_config.batch_size = 1000
        self.mock_config.concurrency_limit = 4
        self.mock_metrics_collector = Mock()

    def test_should_optimize_batch_sizes_based_on_performance(self):
        """Test dynamic batch size optimization based on performance metrics."""
        # Given: Performance monitor that suggests optimization
        mock_performance_monitor = Mock()
        mock_performance_monitor.get_optimal_batch_size.return_value = 750
        
        coordinator = BatchOperationCoordinator(
            config=self.mock_config,
            performance_monitor=mock_performance_monitor
        )
        
        # When: Getting optimized batch size
        optimal_size = coordinator.get_optimized_batch_size(
            current_performance={"throughput": 500, "error_rate": 0.02}
        )
        
        # Then: Should optimize based on performance
        mock_performance_monitor.get_optimal_batch_size.assert_called_once()
        assert optimal_size == 750

    def test_should_coordinate_concurrent_batch_operations(self):
        """Test coordination of concurrent batch operations."""
        # Given: Concurrency manager for batch coordination
        mock_concurrency_manager = Mock()
        mock_concurrency_manager.acquire_slot.return_value = True
        
        coordinator = BatchOperationCoordinator(
            config=self.mock_config,
            concurrency_manager=mock_concurrency_manager
        )
        
        # When: Coordinating concurrent batches
        batch_operations = [Mock() for _ in range(5)]
        results = coordinator.execute_concurrent_batches(batch_operations)
        
        # Then: Should coordinate within concurrency limits
        assert mock_concurrency_manager.acquire_slot.call_count <= self.mock_config.concurrency_limit
        assert len(results) == 5

    def test_should_implement_backpressure_when_system_overloaded(self):
        """Test backpressure implementation when system is overloaded."""
        # Given: System monitor indicating overload
        mock_system_monitor = Mock()
        mock_system_monitor.is_system_overloaded.return_value = True
        
        coordinator = BatchOperationCoordinator(
            config=self.mock_config,
            system_monitor=mock_system_monitor
        )
        
        # When: Attempting operation under system overload
        should_throttle = coordinator.should_apply_backpressure()
        
        # Then: Should apply backpressure
        mock_system_monitor.is_system_overloaded.assert_called_once()
        assert should_throttle is True

    def test_should_coordinate_with_adaptive_batching_strategy(self):
        """Test coordination with adaptive batching strategies."""
        # Given: Adaptive strategy that adjusts batch parameters
        mock_adaptive_strategy = Mock()
        mock_adaptive_strategy.get_adaptive_parameters.return_value = {
            "batch_size": 800,
            "delay_between_batches": 0.1,
            "concurrency": 3
        }
        
        coordinator = BatchOperationCoordinator(
            config=self.mock_config,
            adaptive_strategy=mock_adaptive_strategy
        )
        
        # When: Getting adaptive batch parameters
        params = coordinator.get_adaptive_batch_parameters(
            system_load=0.7,
            error_rate=0.01
        )
        
        # Then: Should use adaptive strategy
        mock_adaptive_strategy.get_adaptive_parameters.assert_called_once()
        assert params["batch_size"] == 800
        assert params["concurrency"] == 3


class TestConnectionManager:
    """Test connection management with resilience patterns."""

    def setup_method(self):
        self.mock_connection_pool = Mock()
        self.mock_health_checker = Mock()
        self.mock_retry_handler = Mock()

    def test_should_manage_connection_pool_with_health_monitoring(self):
        """Test connection pool management with health monitoring."""
        # Given: Connection pool with health monitoring
        self.mock_connection_pool.get_healthy_connection.return_value = Mock()
        self.mock_health_checker.check_connection_health.return_value = True
        
        manager = ConnectionManager(
            connection_pool=self.mock_connection_pool,
            health_checker=self.mock_health_checker
        )
        
        # When: Getting healthy connection
        connection = manager.get_healthy_connection()
        
        # Then: Should check health and return connection
        self.mock_connection_pool.get_healthy_connection.assert_called_once()
        self.mock_health_checker.check_connection_health.assert_called()
        assert connection is not None

    def test_should_implement_connection_recovery_on_failure(self):
        """Test connection recovery mechanisms on failure."""
        # Given: Connection that fails then recovers
        self.mock_connection_pool.get_connection.side_effect = [
            WeaviateConnectionError("Connection failed"),
            Mock()  # Successful connection
        ]
        
        manager = ConnectionManager(
            connection_pool=self.mock_connection_pool,
            retry_handler=self.mock_retry_handler
        )
        
        # When: Recovering from connection failure
        self.mock_retry_handler.execute_with_retry.return_value = Mock()
        connection = manager.recover_connection()
        
        # Then: Should retry connection establishment
        self.mock_retry_handler.execute_with_retry.assert_called_once()
        assert connection is not None

    def test_should_coordinate_with_load_balancing(self):
        """Test coordination with load balancing across multiple endpoints."""
        # Given: Load balancer for multiple endpoints
        mock_load_balancer = Mock()
        mock_load_balancer.get_best_endpoint.return_value = "weaviate-node-1"
        
        manager = ConnectionManager(
            connection_pool=self.mock_connection_pool,
            load_balancer=mock_load_balancer
        )
        
        # When: Getting connection with load balancing
        endpoint = manager.get_load_balanced_connection()
        
        # Then: Should use load balancer
        mock_load_balancer.get_best_endpoint.assert_called_once()
        assert endpoint == "weaviate-node-1"

    def test_should_implement_connection_warmup_strategies(self):
        """Test connection warmup strategies for performance optimization."""
        # Given: Warmup strategy for connection optimization
        mock_warmup_strategy = Mock()
        mock_warmup_strategy.warmup_connections.return_value = 5
        
        manager = ConnectionManager(
            connection_pool=self.mock_connection_pool,
            warmup_strategy=mock_warmup_strategy
        )
        
        # When: Warming up connections
        warmed_connections = manager.warmup_connection_pool()
        
        # Then: Should warm up connections
        mock_warmup_strategy.warmup_connections.assert_called_once()
        assert warmed_connections == 5


class TestOperationExecutor:
    """Test operation execution with enhanced patterns."""

    def setup_method(self):
        self.mock_retry_handler = Mock()
        self.mock_circuit_breaker = Mock()
        self.mock_metrics_collector = Mock()

    def test_should_execute_operations_with_timeout_handling(self):
        """Test operation execution with timeout handling."""
        # Given: Operation executor with timeout handling
        mock_timeout_handler = Mock()
        mock_timeout_handler.execute_with_timeout.return_value = "timeout_result"
        
        executor = OperationExecutor(
            retry_handler=self.mock_retry_handler,
            timeout_handler=mock_timeout_handler
        )
        
        # When: Executing operation with timeout
        result = executor.execute_with_timeout(
            operation=Mock(),
            timeout_seconds=30
        )
        
        # Then: Should handle timeouts
        mock_timeout_handler.execute_with_timeout.assert_called_once()
        assert result == "timeout_result"

    def test_should_coordinate_operation_cancellation(self):
        """Test coordination of operation cancellation."""
        # Given: Cancellation coordinator
        mock_cancellation_coordinator = Mock()
        mock_cancellation_coordinator.is_cancelled.return_value = True
        
        executor = OperationExecutor(
            retry_handler=self.mock_retry_handler,
            cancellation_coordinator=mock_cancellation_coordinator
        )
        
        # When: Checking operation cancellation
        should_cancel = executor.should_cancel_operation("operation_id")
        
        # Then: Should coordinate cancellation
        mock_cancellation_coordinator.is_cancelled.assert_called_with("operation_id")
        assert should_cancel is True

    def test_should_implement_operation_queuing_and_prioritization(self):
        """Test operation queuing and prioritization."""
        # Given: Operation queue with prioritization
        mock_operation_queue = Mock()
        mock_operation_queue.enqueue_with_priority.return_value = "queued"
        
        executor = OperationExecutor(
            retry_handler=self.mock_retry_handler,
            operation_queue=mock_operation_queue
        )
        
        # When: Queuing operation with priority
        result = executor.queue_operation(
            operation=Mock(),
            priority="high"
        )
        
        # Then: Should queue with priority
        mock_operation_queue.enqueue_with_priority.assert_called_once()
        assert result == "queued"

    def test_should_coordinate_with_resource_management(self):
        """Test coordination with resource management."""
        # Given: Resource manager for operation resources
        mock_resource_manager = Mock()
        mock_resource_manager.acquire_resources.return_value = True
        mock_resource_manager.release_resources.return_value = True
        
        executor = OperationExecutor(
            retry_handler=self.mock_retry_handler,
            resource_manager=mock_resource_manager
        )
        
        # When: Executing operation with resource management
        with executor.managed_resources(resource_type="compute"):
            pass
        
        # Then: Should manage resources
        mock_resource_manager.acquire_resources.assert_called_with("compute")
        mock_resource_manager.release_resources.assert_called_with("compute")


class TestEnhancedManagerIntegration:
    """Test integration patterns across enhanced manager components."""

    def test_should_coordinate_end_to_end_document_ingestion(self):
        """Test end-to-end document ingestion with all enhancements."""
        # Given: Complete enhanced manager setup
        mock_config = Mock()
        mock_config.batch_size = 1000
        
        mock_components = {
            "circuit_breaker": Mock(),
            "metrics_collector": Mock(),
            "retry_handler": Mock(),
            "health_checker": Mock(),
            "batch_coordinator": Mock(),
            "connection_manager": Mock()
        }
        
        # Configure mocks for successful operation
        mock_components["health_checker"].check_system_health.return_value = {"is_healthy": True}
        mock_components["circuit_breaker"].should_allow_request.return_value = True
        mock_components["retry_handler"].execute_with_retry.return_value = "success"
        
        manager = EnhancedWeaviateManager(
            config=mock_config,
            **mock_components
        )
        
        # When: Performing end-to-end document ingestion
        mock_document = Mock()
        mock_document.chunks = [Mock() for _ in range(100)]
        
        result = manager.ingest_document_with_full_resilience(
            client=Mock(),
            document=mock_document,
            embedder="test_embedder"
        )
        
        # Then: Should coordinate all components
        mock_components["health_checker"].check_system_health.assert_called()
        mock_components["circuit_breaker"].should_allow_request.assert_called()
        mock_components["retry_handler"].execute_with_retry.assert_called()
        mock_components["metrics_collector"].record_batch_operation.assert_called()
        assert result == "success"

    def test_should_handle_cascading_failures_gracefully(self):
        """Test graceful handling of cascading failures."""
        # Given: Manager with failing components
        mock_config = Mock()
        
        mock_health_checker = Mock()
        mock_health_checker.check_system_health.return_value = {"is_healthy": False}
        
        mock_circuit_breaker = Mock()
        mock_circuit_breaker.should_allow_request.return_value = False
        
        manager = EnhancedWeaviateManager(
            config=mock_config,
            health_checker=mock_health_checker,
            circuit_breaker=mock_circuit_breaker
        )
        
        # When: Attempting operation during cascading failures
        with pytest.raises(Exception, match="System not healthy"):
            manager.execute_with_full_protection(
                operation=Mock(),
                operation_name="test_operation"
            )
        
        # Then: Should detect and handle cascading failures
        mock_health_checker.check_system_health.assert_called()
        # Circuit breaker should not be reached due to health check failure