"""Plugin management for video analysis."""
import importlib
import inspect
import time
from typing import List, Dict
from dataclasses import asdict

from core.config import AnalysisConfig
from core.types import FrameAnalysis
from monitoring.metrics import PluginMetricsCollector
from services.logger import get_logger
import numpy as np
from plugins.base import AnalyzerPlugin, FrameAnalysis
import traceback

logger = get_logger(__name__)

# Import base plugin
try:
    from plugins.base import AnalyzerPlugin
except ImportError:
    logger.error("Could not import base plugin")
    AnalyzerPlugin = None


class PluginManager:
    """Manages video analysis plugins."""

    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.plugins:  List[AnalyzerPlugin] = []
        self.metrics_collector = PluginMetricsCollector()
        self.frame_counters: Dict[str, int] = {}

        self._load_plugins()

    def _load_plugins(self) -> None:
        """Load all available plugins."""
        if AnalyzerPlugin is None:
            logger.error("Cannot load plugins: base plugin not available")
            return

        config_dict = asdict(self.config)
        config_dict['device'] = self.config.device

        plugin_definitions = [
            ("ObjectDetectionPlugin", "object_detection"),
            ("FaceRecognitionPlugin", "face_recognition"),
            ("ShotTypePlugin", "shot_type"),
            ("DominantColorPlugin", "dominant_color"),
            ("DescriptorPlugin", "descriptor"),
            ("TextDetectionPlugin", "text_detection"),
        ]

        for plugin_name, module_stem in plugin_definitions:
            try:
                module = importlib.import_module(f"plugins.{module_stem}")

                for name, cls in inspect.getmembers(module, inspect.isclass):
                    if (name == plugin_name and
                        issubclass(cls, AnalyzerPlugin) and
                            cls is not AnalyzerPlugin):

                        plugin = cls(config_dict)
                        self.plugins.append(plugin)
                        logger.info(f"Loaded plugin: {plugin_name}")
                        break

            except Exception as e:
                logger.error(f"Failed to load {plugin_name}: {e}")

        logger.info(f"Loaded {len(self.plugins)} plugins")

    def setup_plugins(self, video_path: str, job_id: str) -> None:
        """Initialize all plugins."""
        for plugin in self.plugins:
            try:
                plugin.setup(video_path, job_id)
            except Exception as e:
                logger.error(
                    f"Failed to setup {plugin.__class__.__name__}: {e}")

    def process_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        frame_idx: int,
        video_path: str
    ) -> FrameAnalysis:
        """Process frame through all applicable plugins."""
        for plugin in self.plugins:
            if not self._should_run_plugin(plugin, frame_idx):
                continue

            try:
                result = self._execute_plugin(
                    plugin, frame, frame_analysis, video_path)
                if result:
                    frame_analysis.update(result)
            except Exception as e:
                logger.warning(
                    f"Plugin {plugin.__class__.__name__} failed on frame {frame_idx}: {e}"
                )
                logger.error(traceback.format_exc())
                self.metrics_collector.record_error(plugin.__class__.__name__)

        return frame_analysis

    def _should_run_plugin(self, plugin: AnalyzerPlugin, video_path: int) -> bool:
        """Determine if plugin should run on this frame."""
        plugin_name = plugin.__class__.__name__

        # Critical plugins always run
        critical_plugins = ['FaceRecognitionPlugin', 'ObjectDetectionPlugin']
        if plugin_name in critical_plugins:
            return True

        # Check skip interval
        skip_interval = self.config.plugin_skip_interval.get(plugin_name, 1)

        if plugin_name not in self.frame_counters:
            self.frame_counters[plugin_name] = 0

        self.frame_counters[plugin_name] += 1

        return self.frame_counters[plugin_name] % skip_interval == 0

    def _execute_plugin(
        self,
        plugin: AnalyzerPlugin,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str
    ) -> FrameAnalysis:
        """Execute plugin with timing."""
        plugin_name = plugin.__class__.__name__
        start_time = time.time()

        try:
            result = plugin.analyze_frame(frame, frame_analysis, video_path)
            duration_ms = (time.time() - start_time) * 1000
            self.metrics_collector.record_execution(plugin_name, duration_ms)
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.metrics_collector.record_error(plugin_name)
            raise

    def get_metrics(self) -> List[Dict]:
        """Get plugin performance metrics."""
        metrics = self.metrics_collector.get_metrics()
        return [m.to_dict() for m in metrics]
    
    def reset_metrics(self) -> List[Dict]:
        """Get plugin performance metrics."""
        self.metrics_collector = PluginMetricsCollector()
        self.frame_counters = {}
