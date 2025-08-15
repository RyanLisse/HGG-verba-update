"""Health checking system for Weaviate operations.

This module provides comprehensive health monitoring following TDD London School principles,
with emphasis on proactive health detection, coordination, and observability.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol


class WeaviateClient(Protocol):
    """Protocol for Weaviate client health checking."""
    
    def is_ready(self) -> bool:
        """Check if Weaviate is ready."""
        ...
    
    def is_live(self) -> bool:
        """Check if Weaviate is live."""
        ...


class Timer(Protocol):
    """Protocol for timing operations."""
    
    def time(self) -> float:
        """Get current time."""
        ...


class MetricsCollector(Protocol):
    """Protocol for health metrics collection."""
    
    def record_health_check(
        self, 
        component: str, 
        is_healthy: bool, 
        response_time: float
    ) -> None:
        """Record health check results."""
        ...


class Alerting(Protocol):
    """Protocol for health alerting."""
    
    def should_alert_on_failure(self, component: str) -> bool:
        """Check if should alert on component failure."""
        ...
    
    def send_health_alert(self) -> None:
        """Send health alert."""
        ...


class ConnectionTester(Protocol):
    """Protocol for connection testing."""
    
    def test_connection(self) -> bool:
        """Test basic connectivity."""
        ...


class QueryExecutor(Protocol):
    """Protocol for query execution."""
    
    def execute_health_query(self) -> Dict[str, Any]:
        """Execute health check query."""
        ...


class PerformanceChecker(Protocol):
    """Protocol for performance checking."""
    
    def check_response_time(self) -> float:
        """Check response time."""
        ...
    
    def check_throughput(self) -> float:
        """Check throughput."""
        ...


class DependencyChecker(Protocol):
    """Protocol for dependency checking."""
    
    def check_dependencies(self) -> Dict[str, bool]:
        """Check all dependencies."""
        ...


class ComponentProbe(Protocol):
    """Protocol for component probing."""
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get component metrics."""
        ...


class CircuitBreaker(Protocol):
    """Protocol for circuit breaker integration."""
    
    def get_circuit_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        ...


class ScoreCalculator(Protocol):
    """Protocol for health score calculation."""
    
    def calculate_weighted_score(self) -> float:
        """Calculate weighted health score."""
        ...


class HistoryTracker(Protocol):
    """Protocol for health history tracking."""
    
    def record_health_event(self, health_status: 'HealthStatus') -> None:
        """Record health event."""
        ...


class TrendAnalyzer(Protocol):
    """Protocol for health trend analysis."""
    
    def analyze_trend(self) -> Dict[str, Any]:
        """Analyze health trends."""
        ...


class ThresholdChecker(Protocol):
    """Protocol for threshold checking."""
    
    def check_thresholds(self) -> List[Dict[str, Any]]:
        """Check health thresholds."""
        ...


class DashboardClient(Protocol):
    """Protocol for dashboard reporting."""
    
    def update_health_status(self, health_data: Dict[str, Any]) -> None:
        """Update health status on dashboard."""
        ...


class NotificationService(Protocol):
    """Protocol for notification services."""
    
    def should_notify(self, health_status: 'HealthStatus') -> bool:
        """Check if should send notification."""
        ...
    
    def send_health_alert(self) -> None:
        """Send health alert."""
        ...


class LogAggregator(Protocol):
    """Protocol for log aggregation."""
    
    def log_event(self, event: Dict[str, Any]) -> None:
        """Log health event."""
        ...


class SwarmCoordinator(Protocol):
    """Protocol for swarm coordination."""
    
    def broadcast_health_status(self, health_status: 'HealthStatus') -> None:
        """Broadcast health status to swarm."""
        ...


class PeerDiscovery(Protocol):
    """Protocol for peer discovery."""
    
    def get_peer_health_statuses(self) -> List[Dict[str, Any]]:
        """Get health statuses from peers."""
        ...


@dataclass
class HealthStatus:
    """Health status representation with rich metadata."""
    
    component: str
    is_healthy: bool
    response_time: Optional[float] = None
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=datetime.now)
    
    def calculate_health_score(self) -> float:
        """Calculate health score based on metrics."""
        if not self.is_healthy:
            return 0.0
        
        score = 1.0
        
        # Factor in response time
        if self.response_time:
            if self.response_time > 1.0:
                score *= 0.5
            elif self.response_time > 0.5:
                score *= 0.8
        
        # Factor in performance metrics
        if self.performance_metrics:
            cpu_usage = self.performance_metrics.get("cpu_usage", 0)
            memory_usage = self.performance_metrics.get("memory_usage", 0)
            
            if cpu_usage > 80:
                score *= 0.7
            if memory_usage > 85:
                score *= 0.6
        
        return max(0.0, min(1.0, score))


class WeaviateHealthChecker:
    """Health checker for Weaviate operations.
    
    Coordinates with multiple systems to provide comprehensive health monitoring.
    """
    
    def __init__(
        self,
        weaviate_client: Optional[WeaviateClient] = None,
        timer: Optional[Timer] = None,
        metrics_collector: Optional[MetricsCollector] = None,
        alerting: Optional[Alerting] = None,
        swarm_coordinator: Optional[SwarmCoordinator] = None
    ):
        self._weaviate_client = weaviate_client
        self._timer = timer or DefaultTimer()
        self._metrics_collector = metrics_collector
        self._alerting = alerting
        self._swarm_coordinator = swarm_coordinator
    
    def check_connectivity(self) -> HealthStatus:
        """Check basic Weaviate connectivity."""
        if not self._weaviate_client:
            return HealthStatus(
                component="weaviate",
                is_healthy=False,
                error_message="No client configured"
            )
        
        try:
            is_ready = self._weaviate_client.is_ready()
            is_live = self._weaviate_client.is_live()
            is_healthy = is_ready and is_live
            
            return HealthStatus(
                component="weaviate",
                is_healthy=is_healthy,
                metadata={"ready": is_ready, "live": is_live}
            )
        except Exception as e:
            return HealthStatus(
                component="weaviate",
                is_healthy=False,
                error_message=str(e)
            )
    
    def check_with_timing(self) -> HealthStatus:
        """Check health with response time measurement."""
        start_time = self._timer.time()
        health_status = self.check_connectivity()
        end_time = self._timer.time()
        
        health_status.response_time = end_time - start_time
        return health_status
    
    def check_and_record_metrics(self) -> HealthStatus:
        """Check health and record metrics."""
        health_status = self.check_with_timing()
        
        if self._metrics_collector:
            self._metrics_collector.record_health_check(
                component="weaviate",
                is_healthy=health_status.is_healthy,
                response_time=health_status.response_time or 0.0
            )
        
        return health_status
    
    def check_with_alerting(self) -> HealthStatus:
        """Check health with alerting integration."""
        health_status = self.check_connectivity()
        
        if not health_status.is_healthy and self._alerting:
            if self._alerting.should_alert_on_failure("weaviate"):
                self._alerting.send_health_alert()
        
        return health_status
    
    def share_health_with_swarm(self, health_status: HealthStatus) -> None:
        """Share health status with swarm."""
        if self._swarm_coordinator:
            self._swarm_coordinator.broadcast_health_status(health_status)


class HealthProbe:
    """Generic health probe for various checks.
    
    Provides different levels of health checking capabilities.
    """
    
    def __init__(
        self,
        connection_tester: Optional[ConnectionTester] = None,
        query_executor: Optional[QueryExecutor] = None,
        performance_checker: Optional[PerformanceChecker] = None
    ):
        self._connection_tester = connection_tester
        self._query_executor = query_executor
        self._performance_checker = performance_checker
    
    def check_basic_connectivity(self) -> bool:
        """Perform basic connectivity check."""
        if self._connection_tester:
            return self._connection_tester.test_connection()
        return True
    
    def check_functional_health(self) -> Dict[str, Any]:
        """Perform functional health check."""
        if self._query_executor:
            return self._query_executor.execute_health_query()
        return {"status": "ok"}
    
    def check_performance_health(self) -> Dict[str, Any]:
        """Check performance-related health metrics."""
        metrics = {}
        if self._performance_checker:
            metrics["response_time"] = self._performance_checker.check_response_time()
            metrics["throughput"] = self._performance_checker.check_throughput()
        return metrics


class ComponentHealth:
    """Health monitoring for individual components.
    
    Provides component-specific health checks and dependency monitoring.
    """
    
    def __init__(
        self,
        component_name: str,
        dependency_checker: Optional[DependencyChecker] = None,
        component_probe: Optional[ComponentProbe] = None,
        circuit_breaker: Optional[CircuitBreaker] = None
    ):
        self.component_name = component_name
        self._dependency_checker = dependency_checker
        self._component_probe = component_probe
        self._circuit_breaker = circuit_breaker
    
    def check_with_dependencies(self) -> HealthStatus:
        """Check component health including dependencies."""
        if not self._dependency_checker:
            return HealthStatus(component=self.component_name, is_healthy=True)
        
        dependencies = self._dependency_checker.check_dependencies()
        all_healthy = all(dependencies.values())
        
        return HealthStatus(
            component=self.component_name,
            is_healthy=all_healthy,
            metadata={"dependencies": dependencies}
        )
    
    def get_aggregated_metrics(self) -> Dict[str, Any]:
        """Get aggregated component metrics."""
        if self._component_probe:
            return self._component_probe.get_metrics()
        return {}
    
    def check_with_circuit_breaker(self) -> HealthStatus:
        """Check health including circuit breaker status."""
        circuit_healthy = True
        circuit_stats = {}
        
        if self._circuit_breaker:
            circuit_stats = self._circuit_breaker.get_circuit_stats()
            circuit_healthy = circuit_stats.get("state") == "CLOSED"
        
        return HealthStatus(
            component=self.component_name,
            is_healthy=circuit_healthy,
            metadata={"circuit_breaker": circuit_stats}
        )


class HealthAggregator:
    """Aggregates health across multiple components and systems.
    
    Provides system-wide health coordination and scoring.
    """
    
    def __init__(
        self,
        health_checkers: Optional[Dict[str, Any]] = None,
        score_calculator: Optional[ScoreCalculator] = None,
        component_weights: Optional[Dict[str, float]] = None,
        history_tracker: Optional[HistoryTracker] = None,
        peer_discovery: Optional[PeerDiscovery] = None
    ):
        self._health_checkers = health_checkers or {}
        self._score_calculator = score_calculator
        self._component_weights = component_weights or {}
        self._history_tracker = history_tracker
        self._peer_discovery = peer_discovery
    
    def get_overall_health(self) -> HealthStatus:
        """Get overall system health status."""
        component_statuses = []
        overall_healthy = True
        
        for name, checker in self._health_checkers.items():
            status = checker.check_health()
            component_statuses.append(status)
            if not status.is_healthy:
                overall_healthy = False
        
        return HealthStatus(
            component="system",
            is_healthy=overall_healthy,
            metadata={"component_count": len(component_statuses)},
            component_statuses=component_statuses
        )
    
    def calculate_weighted_health_score(self) -> float:
        """Calculate weighted health score."""
        if self._score_calculator:
            return self._score_calculator.calculate_weighted_score()
        return 1.0
    
    def record_health_check(self, health_status: HealthStatus) -> None:
        """Record health check for history tracking."""
        if self._history_tracker:
            self._history_tracker.record_health_event(health_status)
    
    def get_swarm_health_score(self) -> float:
        """Get health score across swarm members."""
        if not self._peer_discovery:
            return 1.0
        
        peer_statuses = self._peer_discovery.get_peer_health_statuses()
        if not peer_statuses:
            return 1.0
        
        health_scores = [status["health"] for status in peer_statuses]
        return sum(health_scores) / len(health_scores)


class SystemHealthCalculator:
    """Calculates system-wide health metrics and trends.
    
    Provides predictive health analysis and threshold monitoring.
    """
    
    def __init__(
        self,
        trend_analyzer: Optional[TrendAnalyzer] = None,
        threshold_checker: Optional[ThresholdChecker] = None
    ):
        self._trend_analyzer = trend_analyzer
        self._threshold_checker = threshold_checker
    
    def analyze_health_trends(self) -> Dict[str, Any]:
        """Analyze health trends for predictive monitoring."""
        if self._trend_analyzer:
            return self._trend_analyzer.analyze_trend()
        return {"direction": "stable", "rate": 0.0, "confidence": 1.0}
    
    def check_health_thresholds(self) -> List[Dict[str, Any]]:
        """Check for health threshold violations."""
        if self._threshold_checker:
            return self._threshold_checker.check_thresholds()
        return []


class HealthReporter:
    """Reports health status to external systems.
    
    Coordinates with dashboards, notifications, and logging systems.
    """
    
    def __init__(
        self,
        dashboard_client: Optional[DashboardClient] = None,
        notification_service: Optional[NotificationService] = None,
        log_aggregator: Optional[LogAggregator] = None
    ):
        self._dashboard_client = dashboard_client
        self._notification_service = notification_service
        self._log_aggregator = log_aggregator
    
    def report_to_dashboard(self, health_data: Dict[str, Any]) -> None:
        """Report health data to monitoring dashboard."""
        if self._dashboard_client:
            self._dashboard_client.update_health_status(health_data)
    
    def handle_critical_health(self, health_status: HealthStatus) -> None:
        """Handle critical health events."""
        if self._notification_service:
            if self._notification_service.should_notify(health_status):
                self._notification_service.send_health_alert()
    
    def log_health_event(self, event: Dict[str, Any]) -> None:
        """Log health event for aggregation."""
        if self._log_aggregator:
            self._log_aggregator.log_event(event)


# Default implementations
class DefaultTimer:
    """Default timer implementation."""
    
    def time(self) -> float:
        """Get current time."""
        return time.time()


class DefaultWeaviateClient:
    """Default Weaviate client for testing."""
    
    def is_ready(self) -> bool:
        """Default ready check."""
        return True
    
    def is_live(self) -> bool:
        """Default liveness check."""
        return True


class DefaultConnectionTester:
    """Default connection tester."""
    
    def test_connection(self) -> bool:
        """Default connection test."""
        return True


class DefaultPerformanceChecker:
    """Default performance checker."""
    
    def check_response_time(self) -> float:
        """Default response time check."""
        return 0.1
    
    def check_throughput(self) -> float:
        """Default throughput check."""
        return 1000.0