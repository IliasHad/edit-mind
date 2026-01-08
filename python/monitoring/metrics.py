"""Metrics tracking and reporting."""
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Union
from collections import defaultdict
import time


@dataclass
class ServiceMetrics:
    """Service-level metrics."""
    total_analyses: int = 0
    total_transcriptions: int = 0
    failed_analyses: int = 0
    failed_transcriptions: int = 0
    
    def record_analysis(self, success: bool) -> None:
        """Record analysis completion."""
        self.total_analyses += 1
        if not success:
            self.failed_analyses += 1
    
    def record_transcription(self, success: bool) -> None:
        """Record transcription completion."""
        self.total_transcriptions += 1
        if not success:
            self.failed_transcriptions += 1
    
    def to_dict(self) -> Dict[str, Union[int, float]]:
        """Convert to dictionary with calculated rates."""
        return {
            "total_analyses": self.total_analyses,
            "total_transcriptions": self.total_transcriptions,
            "failed_analyses": self.failed_analyses,
            "failed_transcriptions": self.failed_transcriptions,
            "success_rate_analyses": self._success_rate(
                self.total_analyses, self.failed_analyses
            ),
            "success_rate_transcriptions": self._success_rate(
                self.total_transcriptions, self.failed_transcriptions
            )
        }
    
    @staticmethod
    def _success_rate(total: int, failed: int) -> float:
        """Calculate success rate percentage."""
        if total == 0:
            return 100.0
        return ((total - failed) / total) * 100.0


@dataclass
class PerformanceMetrics:
    """Performance metrics for specific stages."""
    stage: str
    duration_seconds: float
    frames_processed: int = 0
    fps: float = 0.0
    memory_mb: float = 0.0
    peak_memory_mb: float = 0.0


@dataclass
class PluginMetrics:
    """Plugin-specific performance metrics."""
    plugin_name: str
    total_duration_seconds: float = 0.0
    frames_processed: int = 0
    avg_time_per_frame_ms: float = 0.0
    min_time_ms: float = float('inf')
    max_time_ms: float = 0.0
    timeout_count: int = 0
    error_count: int = 0
    
    def to_dict(self) -> Dict[str, Union[str, int, float]]:
        """Convert to dictionary."""
        return asdict(self)


class PluginMetricsCollector:
    """Collects and aggregates plugin metrics."""
    
    def __init__(self):
        self._timings: Dict[str, List[float]] = defaultdict(list)
        self._errors: Dict[str, int] = defaultdict(int)
        self._timeouts: Dict[str, int] = defaultdict(int)
    
    def record_execution(self, plugin_name: str, duration_ms: float) -> None:
        """Record a plugin execution time."""
        self._timings[plugin_name].append(duration_ms)
    
    def record_error(self, plugin_name: str) -> None:
        """Record a plugin error."""
        self._errors[plugin_name] += 1
    
    def record_timeout(self, plugin_name: str) -> None:
        """Record a plugin timeout."""
        self._timeouts[plugin_name] += 1
    
    def get_metrics(self) -> List[PluginMetrics]:
        """Get aggregated metrics for all plugins."""
        metrics = []
        
        for plugin_name, timings in self._timings.items():
            if not timings:
                continue
            
            metrics.append(PluginMetrics(
                plugin_name=plugin_name,
                total_duration_seconds=sum(timings) / 1000,
                frames_processed=len(timings),
                avg_time_per_frame_ms=sum(timings) / len(timings),
                min_time_ms=min(timings),
                max_time_ms=max(timings),
                timeout_count=self._timeouts.get(plugin_name, 0),
                error_count=self._errors.get(plugin_name, 0)
            ))
        
        # Sort by total duration (highest first)
        metrics.sort(key=lambda x: x.total_duration_seconds, reverse=True)
        return metrics


class StageTimer:
    """Context manager for timing operations."""
    
    def __init__(self, stage_name: str):
        self.stage_name = stage_name
        self.start_time: float = 0.0
        self.end_time: float = 0.0
        self.duration: float = 0.0
    
    def __enter__(self) -> "StageTimer":
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args) -> None:
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time