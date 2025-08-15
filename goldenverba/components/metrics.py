"""Metrics collection system for Weaviate operations.

This module provides comprehensive metrics collection following TDD London School principles,
with emphasis on observability, performance monitoring, and system health tracking.
"""

import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Protocol

from .exceptions import WeaviateBatchError, WeaviateError


class MetricsBackend(Protocol):
    """Protocol for metrics backend systems."""

    def create_histogram(self, name: str, description: str) -> Any:
        """Create histogram metric."""
        ...

    def record_duration(
        self, metric_name: str, duration: float, labels: Dict[str, Any] | None = None
    ) -> None:
        """Record duration metric."""
        ...

    def record_gauge(
        self, metric_name: str, value: float, labels: Dict[str, Any] | None = None
    ) -> None:
        """Record gauge metric."""
        ...

    def increment_counter(
        self, metric_name: str, labels: Dict[str, Any] | None = None
    ) -> None:
        """Increment counter metric."""
        ...


class Timer(Protocol):
    """Protocol for timing operations."""

    def time(self) -> float:
        """Get current time."""
        ...


class ThroughputCalculator(Protocol):
    """Protocol for throughput calculations."""

    def calculate_throughput(self, items: int, duration: float) -> float:
        """Calculate throughput in items per second."""
        ...


class ErrorCalculator(Protocol):
    """Protocol for error rate calculations."""

    def calculate_error_rate(self, total_items: int, failed_items: int) -> float:
        """Calculate error rate as percentage."""
        ...


class StateTracker(Protocol):
    """Protocol for tracking state durations."""

    def get_state_duration(self, state: str) -> timedelta:
        """Get duration spent in a state."""
        ...


class RecoveryTracker(Protocol):
    """Protocol for tracking recovery times."""

    def measure_recovery_time(self, circuit_id: str) -> float:
        """Measure recovery time for circuit breaker."""
        ...


class Alerting(Protocol):
    """Protocol for alerting integration."""

    def should_alert(self, metric: str, value: float) -> bool:
        """Check if metric value should trigger alert."""
        ...

    def send_alert(self) -> None:
        """Send alert notification."""
        ...


class ConnectionPool(Protocol):
    """Protocol for connection pool monitoring."""

    def get_active_connections(self) -> int:
        """Get number of active connections."""
        ...

    def get_idle_connections(self) -> int:
        """Get number of idle connections."""
        ...

    def get_total_connections(self) -> int:
        """Get total number of connections."""
        ...


class HealthMonitor(Protocol):
    """Protocol for health monitoring."""

    def get_health_status(self) -> dict[str, Any]:
        """Get current health status."""
        ...


class MetricsExporter(Protocol):
    """Protocol for metrics export."""

    def export_all_metrics(self) -> None:
        """Export all collected metrics."""
        ...


class CrossCalculator(Protocol):
    """Protocol for cross-cutting metrics calculations."""

    def calculate_system_health_score(self) -> float:
        """Calculate overall system health score."""
        ...


class SystemMonitor(Protocol):
    """Protocol for system resource monitoring."""

    def get_cpu_usage(self) -> float:
        """Get CPU usage percentage."""
        ...

    def get_memory_usage(self) -> float:
        """Get memory usage percentage."""
        ...

    def get_disk_usage(self) -> float:
        """Get disk usage percentage."""
        ...


class PerformanceTracker(Protocol):
    """Protocol for performance tracking."""

    def calculate_health_score(self) -> float:
        """Calculate performance-based health score."""
        ...


class SwarmHealth(Protocol):
    """Protocol for swarm health coordination."""

    def broadcast_health_status(self, health_data: dict[str, Any]) -> None:
        """Broadcast health status to swarm."""
        ...


class BatchOperationMetrics:
    """Metrics collection for batch operations.

    Coordinates with multiple systems to track batch processing performance.
    """

    def __init__(
        self,
        metrics_backend: MetricsBackend,
        timer: Timer | None = None,
        throughput_calculator: Optional[ThroughputCalculator] = None,
        error_calculator: Optional[ErrorCalculator] = None,
    ):
        self._metrics_backend = metrics_backend
        self._timer = timer or DefaultTimer()
        self._throughput_calculator = (
            throughput_calculator or DefaultThroughputCalculator()
        )
        self._error_calculator = error_calculator or DefaultErrorCalculator()

        # Create metric instruments
        self._batch_size_histogram = self._metrics_backend.create_histogram(
            "batch_size_distribution", "Distribution of batch sizes processed"
        )

    def record_batch_size(self, size: int) -> None:
        """Record batch size for distribution tracking."""
        self._batch_size_histogram.observe(size)

    @contextmanager
    def measure_batch_duration(self, batch_size: int):
        """Context manager to measure batch processing duration."""
        start_time = self._timer.time()
        try:
            yield
        finally:
            end_time = self._timer.time()
            duration = end_time - start_time
            self._metrics_backend.record_duration(
                metric_name="batch_processing_duration",
                duration=duration,
                labels={"batch_size": batch_size},
            )

    def record_batch_completion(
        self, batch_size: int, duration: float, success_count: int
    ) -> None:
        """Record batch completion metrics."""
        # Calculate and record throughput
        throughput = self._throughput_calculator.calculate_throughput(
            items=success_count, duration=duration
        )
        self._metrics_backend.record_gauge(
            metric_name="batch_throughput", value=throughput
        )

    def record_batch_error(self, batch_error: WeaviateBatchError) -> None:
        """Record batch error metrics."""
        if batch_error.batch_size and batch_error.failed_items:
            error_rate = self._error_calculator.calculate_error_rate(
                total_items=batch_error.batch_size,
                failed_items=len(batch_error.failed_items),
            )
            self._metrics_backend.record_gauge(
                metric_name="batch_error_rate", value=error_rate
            )


class CircuitBreakerMetrics:
    """Metrics collection for circuit breaker operations.

    Tracks state changes, recovery times, and failure patterns.
    """

    def __init__(
        self,
        metrics_backend: MetricsBackend,
        state_tracker: StateTracker | None = None,
        recovery_tracker: Optional[RecoveryTracker] = None,
        alerting: Optional[Alerting] = None,
    ):
        self._metrics_backend = metrics_backend
        self._state_tracker = state_tracker
        self._recovery_tracker = recovery_tracker
        self._alerting = alerting

    def record_state_change(
        self, from_state: str, to_state: str, circuit_id: str
    ) -> None:
        """Record circuit breaker state change."""
        self._metrics_backend.increment_counter(
            metric_name="circuit_breaker_state_changes",
            labels={
                "from_state": from_state,
                "to_state": to_state,
                "circuit_id": circuit_id,
            },
        )

    def record_recovery(self, circuit_id: str) -> None:
        """Record circuit breaker recovery."""
        if self._recovery_tracker:
            recovery_time = self._recovery_tracker.measure_recovery_time(circuit_id)
            self._metrics_backend.record_duration(
                metric_name="circuit_breaker_recovery_time",
                duration=recovery_time,
                labels={"circuit_id": circuit_id},
            )

    def record_failure_threshold_breach(
        self, circuit_id: str, failure_count: int
    ) -> None:
        """Record failure threshold breach."""
        # Check if should alert
        if self._alerting and self._alerting.should_alert(
            "circuit_breaker_failures", failure_count
        ):
            self._alerting.send_alert()

        self._metrics_backend.record_gauge(
            metric_name="circuit_breaker_failure_count",
            value=failure_count,
            labels={"circuit_id": circuit_id},
        )

    def collect_metrics(self) -> None:
        """Collect circuit breaker metrics."""
        # Implementation for periodic metrics collection
        pass


class ConnectionMetrics:
    """Metrics collection for connection management.

    Monitors connection pools, establishment times, and health.
    """

    def __init__(
        self,
        metrics_backend: MetricsBackend,
        connection_pool: ConnectionPool | None = None,
        health_monitor: Optional[HealthMonitor] = None,
        timer: Optional[Timer] = None,
    ):
        self._metrics_backend = metrics_backend
        self._connection_pool = connection_pool
        self._health_monitor = health_monitor
        self._timer = timer or DefaultTimer()

    def collect_pool_metrics(self) -> None:
        """Collect connection pool metrics."""
        if self._connection_pool:
            self._metrics_backend.record_gauge(
                metric_name="connection_pool_active",
                value=self._connection_pool.get_active_connections(),
            )
            self._metrics_backend.record_gauge(
                metric_name="connection_pool_idle",
                value=self._connection_pool.get_idle_connections(),
            )
            self._metrics_backend.record_gauge(
                metric_name="connection_pool_total",
                value=self._connection_pool.get_total_connections(),
            )

    @contextmanager
    def measure_connection_time(self, endpoint: str):
        """Measure connection establishment time."""
        start_time = self._timer.time()
        try:
            yield
        finally:
            end_time = self._timer.time()
            duration = end_time - start_time
            self._metrics_backend.record_duration(
                metric_name="connection_establishment_time",
                duration=duration,
                labels={"endpoint": endpoint},
            )

    def collect_health_metrics(self) -> None:
        """Collect health monitoring metrics."""
        if self._health_monitor:
            health_status = self._health_monitor.get_health_status()
            if "response_time" in health_status:
                self._metrics_backend.record_gauge(
                    metric_name="health_check_response_time",
                    value=health_status["response_time"],
                )

    def collect_metrics(self) -> None:
        """Collect all connection metrics."""
        self.collect_pool_metrics()
        self.collect_health_metrics()


class MetricsAggregator:
    """Aggregates metrics from multiple collectors.

    Coordinates between different metrics systems and provides unified collection.
    """

    def __init__(
        self,
        batch_metrics: BatchOperationMetrics | None = None,
        circuit_metrics: Optional[CircuitBreakerMetrics] = None,
        connection_metrics: Optional[ConnectionMetrics] = None,
        cross_calculator: Optional[CrossCalculator] = None,
        exporter: MetricsExporter | None = None,
    ):
        self._batch_metrics = batch_metrics
        self._circuit_metrics = circuit_metrics
        self._connection_metrics = connection_metrics
        self._cross_calculator = cross_calculator
        self._exporter = exporter

    def collect_all_metrics(self) -> None:
        """Collect metrics from all configured collectors."""
        if self._batch_metrics:
            self._batch_metrics.collect_metrics()
        if self._circuit_metrics:
            self._circuit_metrics.collect_metrics()
        if self._connection_metrics:
            self._connection_metrics.collect_metrics()

    def calculate_system_health(self) -> float:
        """Calculate overall system health score."""
        if self._cross_calculator:
            return self._cross_calculator.calculate_system_health_score()
        return 1.0

    def export_metrics(self) -> None:
        """Export all collected metrics."""
        if self._exporter:
            self._exporter.export_all_metrics()


class MetricsExporter:
    """Exports metrics to external systems.

    Coordinates with multiple metrics backends and handles export failures.
    """

    def __init__(
        self,
        prometheus_client: Any | None = None,
        datadog_client: Optional[Any] = None,
        cloudwatch_client: Optional[Any] = None,
        fallback_handler: Optional[Any] = None,
    ):
        self._prometheus_client = prometheus_client
        self._datadog_client = datadog_client
        self._cloudwatch_client = cloudwatch_client
        self._fallback_handler = fallback_handler

    def export_to_prometheus(self, metrics_data: dict[str, Any]) -> bool:
        """Export metrics to Prometheus."""
        if self._prometheus_client:
            return self._prometheus_client.push_to_gateway(metrics_data)
        return False

    def export_to_all(self, metrics_data: dict[str, Any]) -> None:
        """Export metrics to all configured backends."""
        if self._prometheus_client:
            self._prometheus_client.export(metrics_data)
        if self._datadog_client:
            self._datadog_client.export(metrics_data)
        if self._cloudwatch_client:
            self._cloudwatch_client.export(metrics_data)

    def export_with_fallback(self, metrics_data: dict[str, Any]) -> None:
        """Export with fallback handling."""
        try:
            if self._prometheus_client:
                self._prometheus_client.export(metrics_data)
        except Exception as e:
            if self._fallback_handler:
                self._fallback_handler.handle_export_failure(
                    backend="prometheus", error=type(e), metrics_data=metrics_data
                )


class HealthMetrics:
    """Health metrics collection and system monitoring.

    Provides comprehensive system health tracking and swarm coordination.
    """

    def __init__(
        self,
        system_monitor: SystemMonitor | None = None,
        performance_tracker: Optional[PerformanceTracker] = None,
        swarm_health: Optional[SwarmHealth] = None,
    ):
        self._system_monitor = system_monitor
        self._performance_tracker = performance_tracker
        self._swarm_health = swarm_health

    def collect_system_metrics(self) -> dict[str, float]:
        """Collect system performance metrics."""
        metrics = {}
        if self._system_monitor:
            metrics.update(
                {
                    "cpu_usage": self._system_monitor.get_cpu_usage(),
                    "memory_usage": self._system_monitor.get_memory_usage(),
                    "disk_usage": self._system_monitor.get_disk_usage(),
                }
            )
        return metrics

    def get_health_score(self) -> float:
        """Get composite health score."""
        if self._performance_tracker:
            return self._performance_tracker.calculate_health_score()
        return 1.0

    def share_health_with_swarm(self, health_data: dict[str, Any]) -> None:
        """Share health metrics with swarm."""
        if self._swarm_health:
            self._swarm_health.broadcast_health_status(health_data)


class WeaviateMetricsCollector:
    """Main metrics collector for Weaviate operations.

    Coordinates all metrics collection and provides unified interface.
    """

    def __init__(
        self,
        metrics_backend: MetricsBackend,
        batch_metrics: BatchOperationMetrics | None = None,
        circuit_metrics: Optional[CircuitBreakerMetrics] = None,
        connection_metrics: Optional[ConnectionMetrics] = None,
        health_metrics: Optional[HealthMetrics] = None,
    ):
        self._metrics_backend = metrics_backend
        self.batch_metrics = batch_metrics or BatchOperationMetrics(metrics_backend)
        self.circuit_metrics = circuit_metrics or CircuitBreakerMetrics(metrics_backend)
        self.connection_metrics = connection_metrics or ConnectionMetrics(
            metrics_backend
        )
        self.health_metrics = health_metrics or HealthMetrics()

    def record_batch_operation(
        self, batch_size: int, duration: float, success_count: int
    ) -> None:
        """Record batch operation metrics."""
        self.batch_metrics.record_batch_size(batch_size)
        self.batch_metrics.record_batch_completion(batch_size, duration, success_count)

    def record_circuit_breaker_event(
        self, event_type: str, circuit_id: str, **kwargs
    ) -> None:
        """Record circuit breaker events."""
        if event_type == "state_change":
            self.circuit_metrics.record_state_change(**kwargs)
        elif event_type == "recovery":
            self.circuit_metrics.record_recovery(circuit_id)

    def collect_all_metrics(self) -> dict[str, Any]:
        """Collect all metrics and return summary."""
        return {
            "system_health": self.health_metrics.get_health_score(),
            "timestamp": datetime.now().isoformat(),
        }


# Default implementations
class DefaultTimer:
    """Default timer implementation."""

    def time(self) -> float:
        """Get current time."""
        return time.time()


class DefaultThroughputCalculator:
    """Default throughput calculator."""

    def calculate_throughput(self, items: int, duration: float) -> float:
        """Calculate throughput in items per second."""
        if duration <= 0:
            return 0.0
        return items / duration


class DefaultErrorCalculator:
    """Default error rate calculator."""

    def calculate_error_rate(self, total_items: int, failed_items: int) -> float:
        """Calculate error rate as percentage."""
        if total_items <= 0:
            return 0.0
        return (failed_items / total_items) * 100.0
