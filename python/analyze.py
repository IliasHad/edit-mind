import sys
import json
import importlib
import inspect
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Iterator, Callable, Union
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time
import warnings
import logging
import math

import cv2
import numpy as np
from tqdm import tqdm
import gc
from plugins.base import AnalyzerPlugin, FrameAnalysis

warnings.filterwarnings('ignore', category=FutureWarning, module='ultralytics')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    logger.warning("psutil not installed. Memory tracking disabled.")

from plugins.base import AnalyzerPlugin


@dataclass
class AnalysisConfig:
    """Video analysis configuration with environment-based overrides."""
    sample_interval_seconds: float = 2.5
    max_workers: int = 4
    batch_size: int = 16
    yolo_confidence: float = 0.5
    yolo_iou: float = 0.45
    known_faces_file: str = 'known_faces.json'
    yolo_model: str = 'yolov8s.pt'
    output_dir: str = 'analysis_results'
    unknown_faces_dir: str = 'unknown_faces'
    enable_streaming: bool = True
    enable_performance_report: bool = True
    enable_aggressive_gc: bool = True
    frame_buffer_limit: int = 8
    plugin_timeout_seconds: int = 60
    batch_timeout_seconds: int = 300
    memory_cleanup_interval: int = 50
    lazy_plugin_init: bool = True
    target_resolution_height: int = 720 
    plugin_skip_interval: Optional[Dict[str, int]] = None
    
    def __post_init__(self) -> None:
        self._load_settings()
        self._adjust_for_memory()
        self.enable_streaming = True
        
        if self.plugin_skip_interval is None:
            self.plugin_skip_interval = {
                'DominantColorPlugin': 2,
                'TextDetectionPlugin': 3,
                'EmotionDetectionPlugin': 2,
            }

    def _load_settings(self) -> None:
        """Load settings from external JSON file if available."""
        settings_path = Path(__file__).parent.parent / 'settings.json'
        if not settings_path.exists():
            return
            
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                for key, value in settings.items():
                    if hasattr(self, key):
                        setattr(self, key, value)
        except Exception as e:
            logger.warning(f"Failed to load settings.json: {e}")

    def _adjust_for_memory(self) -> None:
        """Auto-adjust workers based on available system memory."""
        if not HAS_PSUTIL:
            return
            
        available_gb = psutil.virtual_memory().available / (1024**3)
        if available_gb < 8:
            self.max_workers = 2
            self.frame_buffer_limit = 4
            self.target_resolution_height = 480
            logger.warning(
                f"Low memory detected ({available_gb:.1f}GB). "
                f"Reducing workers to {self.max_workers}, resolution to {self.target_resolution_height}p"
            )
        elif available_gb < 16:
            self.target_resolution_height = 720
            logger.info(f"Medium memory ({available_gb:.1f}GB). Using 720p resolution")

    @property
    def device(self) -> str:
        """Return processing device with auto-detection."""
        try:
            import torch
            if torch.backends.mps.is_available():
                return 'mps'
            elif torch.cuda.is_available():
                return 'cuda'
        except ImportError:
            pass
        return 'cpu'


@dataclass
class PerformanceMetrics:
    """Performance metrics for analysis stages."""
    stage: str
    duration_seconds: float
    frames_processed: int = 0
    fps: float = 0.0
    memory_mb: Optional[float] = None
    peak_memory_mb: Optional[float] = None

@dataclass
class PluginMetrics:
    """Performance metrics for individual plugins."""
    plugin_name: str
    total_duration_seconds: float
    frames_processed: int
    avg_time_per_frame_ms: float
    min_time_ms: float
    max_time_ms: float
    timeout_count: int = 0
    error_count: int = 0


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result container."""
    video_file: str
    scene_analysis: Dict[str, Union[str, int, float, bool, List, Dict]]
    detected_activities: List[Dict[str, Union[str, int, float]]]
    face_recognition_summary: Dict[str, Union[str, int, float, List]]
    frame_analysis: List[FrameAnalysis]
    summary: Dict[str, Union[str, int, float, List, Dict]]
    performance_metrics: Optional[List[Dict[str, Union[str, int, float]]]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Union[str, int, float, bool, List, Dict, None]]:
        """Convert to JSON-serializable dictionary."""
        data_dict = asdict(self)
        return self._convert_numpy_types(data_dict)

    @staticmethod
    def _convert_numpy_types(obj: Union[Dict, List, np.bool_, np.int_, np.float_, np.ndarray, str, int, float, bool, None]) -> Union[Dict, List, str, int, float, bool, None]:
        """Recursively convert NumPy types to Python native types."""
        if isinstance(obj, dict):
            return {k: VideoAnalysisResult._convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [VideoAnalysisResult._convert_numpy_types(elem) for elem in obj]
        elif isinstance(obj, (np.bool_, np.int_, np.float_)):
            return obj.item()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj


class MemoryMonitor:
    """Aggressive memory management and monitoring."""
    
    def __init__(self, config: AnalysisConfig) -> None:
        self.config: AnalysisConfig = config
        self.process: Optional['psutil.Process'] = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory: float = 0.0
        self.cleanup_count: int = 0
        self.last_cleanup_time: float = time.time()

    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        if not self.process:
            return 0.0
        mem = self.process.memory_info().rss / 1024 / 1024
        self.peak_memory = max(self.peak_memory, mem)
        return mem

    def force_cleanup(self, aggressive: bool = False) -> None:
        """Force Python garbage collection and clear caches."""
        if not self.config.enable_aggressive_gc:
            return
        
        now = time.time()
        if not aggressive and (now - self.last_cleanup_time) < 5.0:
            return
        
        self.last_cleanup_time = now
        collected = gc.collect()
        self.cleanup_count += 1
        
        try:
            import torch
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            elif torch.cuda.is_available():
                torch.cuda.empty_cache()
        except (ImportError, AttributeError):
            pass

        if self.cleanup_count % 10 == 0 or aggressive:
            logger.debug(
                f"Memory cleanup #{self.cleanup_count}: "
                f"{self.get_memory_mb():.0f}MB (peak: {self.peak_memory:.0f}MB) "
                f"[collected {collected} objects]"
            )

    def check_memory_warning(self) -> bool:
        """Check if memory usage is critically low."""
        if not self.process:
            return False
        
        available = psutil.virtual_memory().available / (1024**3)
        if available < 2:
            logger.warning(f"⚠ MEMORY WARNING: Only {available:.1f}GB available!")
            return True
        return False

    def get_memory_stats(self) -> Dict[str, float]:
        """Get detailed memory statistics."""
        if not self.process:
            return {}
        
        mem_info = self.process.memory_info()
        vm = psutil.virtual_memory()
        
        return {
            'current_mb': mem_info.rss / 1024 / 1024,
            'peak_mb': self.peak_memory,
            'available_mb': vm.available / 1024 / 1024,
            'percent_used': vm.percent
        }


class StageTracker:
    """Context manager for performance tracking."""
    
    def __init__(self, analyzer: "VideoAnalyzer", stage_name: str) -> None:
        self.analyzer: VideoAnalyzer = analyzer
        self.stage_name: str = stage_name
        self.start_time: Optional[float] = None
        self.start_memory: Optional[float] = None
        self.frames_processed: int = 0

    def __enter__(self) -> "StageTracker":
        self.start_time = time.time()
        self.start_memory = self.analyzer.memory_monitor.get_memory_mb()
        logger.info(f"Starting stage: {self.stage_name}")
        return self

    def __exit__(self, *args: object) -> None:
        duration = time.time() - self.start_time
        end_memory = self.analyzer.memory_monitor.get_memory_mb()
        memory_delta = end_memory - self.start_memory if self.start_memory else None
        fps = self.frames_processed / duration if duration > 0 and self.frames_processed > 0 else 0.0
        
        metric = PerformanceMetrics(
            stage=self.stage_name,
            duration_seconds=duration,
            frames_processed=self.frames_processed,
            fps=fps,
            memory_mb=memory_delta,
            peak_memory_mb=self.analyzer.memory_monitor.peak_memory
        )
        
        self.analyzer.metrics.append(metric)
        
        if self.frames_processed > 0:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s ({fps:.1f} fps) | Mem: {end_memory:.0f}MB")
        else:
            logger.info(f"✓ {self.stage_name}: {duration:.2f}s | Mem: {end_memory:.0f}MB")


class FrameProcessor:
    """Zero-disk-IO streaming frame extraction and preprocessing."""

    def __init__(self, config: AnalysisConfig) -> None:
        self.config: AnalysisConfig = config
        self.frame_count: int = 0

    def extract_frames_streaming_generator(
        self, 
        video_path: str
    ) -> Iterator[Tuple[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]], float, int]]:
        """Memory-efficient streaming generator that yields frames directly."""
        cap = cv2.VideoCapture(video_path)
        
        try:
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps is None or fps <= 0:
                logger.warning("Invalid FPS detected, defaulting to 30")
                fps = 30.0
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames <= 0:
                raise ValueError("Invalid video file: cannot determine frame count")
            
            sample_interval = max(1, int(fps * self.config.sample_interval_seconds))
            
            for frame_idx in range(0, total_frames, sample_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if not ret:
                    logger.warning(f"Failed to read frame at index {frame_idx}")
                    break

                processed_frame, scale_factor, original_size = self._preprocess_frame(frame)
                
                timestamp_ms = round((frame_idx / fps) * 1000)
                next_frame_idx = min(frame_idx + sample_interval, total_frames)
                end_timestamp_ms = round((next_frame_idx / fps) * 1000)

                frame_data: Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]] = {
                    'frame': processed_frame,
                    'timestamp_ms': timestamp_ms,
                    'end_timestamp_ms': end_timestamp_ms,
                    'frame_idx': frame_idx,
                    'scale_factor': scale_factor,  
                    'original_size': original_size  
                }
                
                yield frame_data, fps, total_frames
                del frame
        
        except Exception as e:
            logger.error(f"Error in frame extraction: {e}")
            raise
        finally:
            if cap is not None:
                cap.release()

    def _preprocess_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """Resize frame for optimal processing with better scaling."""
        if frame is None:
            raise ValueError("Received None frame")
        
        original_h, original_w = frame.shape[:2]
        
        if original_h > self.config.target_resolution_height:
            target_h = self.config.target_resolution_height
            target_w = int(original_w * (target_h / original_h))
            
            resized = cv2.resize(
                frame, 
                (target_w, target_h), 
                interpolation=cv2.INTER_LINEAR
            )
            scale_factor = original_h / target_h  
            return resized, scale_factor, (original_w, original_h)
        
        return frame.copy(), 1.0, (original_w, original_h)


def load_plugins(config: AnalysisConfig) -> List[AnalyzerPlugin]:
    """Dynamically load plugins in priority order for optimal performance."""
    plugins = []
    plugin_dir = Path(__file__).parent / "plugins"
    config_dict = asdict(config)
    config_dict['device'] = config.device

    logger.info(f"Loading plugins from {plugin_dir}...")
    logger.info(f"Target device: {config.device}")

    plugin_module_map = [
        ("ObjectDetectionPlugin", "object_detection"),
        ("FaceRecognitionPlugin", "face_recognition"),
        ("ShotTypePlugin", "shot_type"),
        ("DominantColorPlugin", "dominant_color"),
        ("EnvironmentPlugin", "environment"),
        ("TextDetectionPlugin", "text_detection"),
    ]

    for plugin_name, module_stem in plugin_module_map:
        module_name = f"plugins.{module_stem}"
        
        try:
            module = importlib.import_module(module_name)
            logger.info(f"  ✓ Imported {module_name}")
            
            for name, cls in inspect.getmembers(module, inspect.isclass):
                if name == plugin_name and issubclass(cls, AnalyzerPlugin) and cls is not AnalyzerPlugin:
                    plugin_instance = cls(config_dict)
                    plugins.append(plugin_instance)
                    logger.info(f"  ✓ Initialized {name}")
                    break
                    
        except Exception as e:
            logger.error(f"  ✗ Error with {module_name}: {e}")
            import traceback
            traceback.print_exc()
    
    logger.info(f"Total plugins loaded: {len(plugins)}\n")
    return plugins

class VideoAnalyzer:
    """Main video analysis coordinator with memory-optimized streaming."""

    def __init__(
        self, video_path: str, config: Optional[AnalysisConfig] = None
    ) -> None:
        self.video_path: str = video_path
        self.config: AnalysisConfig = config or AnalysisConfig()
        self.video_base_name: str = Path(self.video_path).stem
        self.metrics: List[PerformanceMetrics] = []
        self.frame_processor: FrameProcessor = FrameProcessor(self.config)
        self.memory_monitor: MemoryMonitor = MemoryMonitor(self.config)
        self.progress_callback: Optional[
            Callable[[float, float, float, float], None]
        ] = None
        self.start_time: Optional[float] = None
        self.frames_analyzed: int = 0
        self.plugin_frame_counters: Dict[str, int] = {}
        self.plugin_metrics: Dict[str, List[float]] = {}
        self.plugin_errors: Dict[str, int] = {}
        self.plugin_timeouts: Dict[str, int] = {}
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)

        self.plugin_definitions: List[AnalyzerPlugin] = load_plugins(self.config)
        self.plugins: List[AnalyzerPlugin] = []

    def _track_stage(self, stage_name: str) -> StageTracker:
        """Create performance tracking context manager."""
        return StageTracker(self, stage_name)

    def analyze(self) -> VideoAnalysisResult:
        """Execute complete video analysis pipeline."""
        start_time = time.time()
        self.start_time = start_time
        
        if self.progress_callback:
            self.progress_callback(0, 0.0, 0, 0)

        try:
            if not Path(self.video_path).exists():
                raise FileNotFoundError(f"Video file not found: {self.video_path}")

            with self._track_stage("plugin_setup"):
                self._setup_plugins()

            frame_analyses = self._analyze_streaming_optimized()

            with self._track_stage("post_processing"):
                scene_analysis, activities, face_summary = self._run_post_processing(frame_analyses)

            total_time = time.time() - start_time

            if self.config.enable_performance_report:
                self._print_performance_report(total_time)

            return VideoAnalysisResult(
                video_file=self.video_path,
                scene_analysis=scene_analysis,
                detected_activities=activities,
                face_recognition_summary=face_summary,
                frame_analysis=frame_analyses,
                summary={
                    "total_frames_analyzed": len(frame_analyses),
                    "primary_activity": activities[0]['activity'] if activities else "unknown",
                    "confidence": activities[0]['confidence'] if activities else 0.0,
                    "total_analysis_time_seconds": total_time,
                    "peak_memory_mb": self.memory_monitor.peak_memory,
                    "memory_cleanups": self.memory_monitor.cleanup_count,
                    "plugin_performance": self._get_plugin_performance_summary() 
                },
                performance_metrics=[asdict(m) for m in self.metrics]
            )

        except Exception as e:
            logger.error(f"\n{'='*70}")
            logger.error(f"✗ FAILED Analysis for {Path(self.video_path).name}")
            logger.error(f"  Error: {str(e)}")
            logger.error(f"{'='*70}\n")
            
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            return self._create_error_result(str(e))

    def _setup_plugins(self) -> None:
        """Initialize all plugins sequentially."""
        if self.config.lazy_plugin_init and self.plugin_definitions:
            if isinstance(self.plugin_definitions[0], tuple):
                logger.info("Initializing plugins sequentially...")
                for name, cls, config_dict in self.plugin_definitions:
                    try:
                        plugin: AnalyzerPlugin = cls(config_dict)
                        plugin.setup()
                        self.plugins.append(plugin)
                    except Exception as e:
                        logger.error(f"  ✗ Failed to setup {name}: {e}")
            else:
                self.plugins = self.plugin_definitions
                for plugin in self.plugins:
                    try:
                        plugin.setup()
                    except Exception as e:
                        logger.error(
                            f"Failed to setup {plugin.__class__.__name__}: {e}"
                        )
        else:
            self.plugins = self.plugin_definitions
            for plugin in self.plugins:
                try:
                    plugin.setup()
                except Exception as e:
                    logger.error(f"Failed to setup {plugin.__class__.__name__}: {e}")

        logger.info(f"Successfully loaded {len(self.plugins)} plugins\n")

    def _analyze_streaming_optimized(self) -> List[FrameAnalysis]:
        """Stream-process video frames with optimized batching."""
        frame_analyses: List[FrameAnalysis] = []
        batch: List[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]] = []
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = int(fps * self.config.sample_interval_seconds)
        total_sampled = (total_frames // sample_interval) + 1
        cap.release()
        
        if HAS_PSUTIL:
            available_gb = psutil.virtual_memory().available / (1024**3)
            if available_gb < 4:
                self.config.frame_buffer_limit = 2
            elif available_gb < 8:
                self.config.frame_buffer_limit = 4
        
        with self._track_stage("streaming_analysis") as stage:
            class CallbackTqdm(tqdm):
                def __init__(self, *args: object, callback: Optional[Callable[[float, float, float, float], None]] = None, **kwargs: object):
                    self.callback = callback
                    self.start_time = time.time()
                    super().__init__(*args, **kwargs)
                
                def update(self, n: int = 1) -> bool:
                    result = super().update(n)
                    if self.callback and self.total:
                        try:
                            elapsed = time.time() - self.start_time
                            progress_percent = min(100.0, (self.n / self.total) * 100.0)
                            self.callback(
                                progress_percent,
                                elapsed,
                                float(self.n),
                                float(self.total)
                            )
                        except Exception as e:
                            logger.debug(f"Progress callback error: {e}")
                    return result
            
            with CallbackTqdm(
                total=total_sampled, 
                desc="  Processing", 
                unit="frame", 
                file=sys.stderr,
                callback=self.progress_callback
            ) as pbar:
                try:
                    frame_generator = self.frame_processor.extract_frames_streaming_generator(
                        self.video_path
                    )
                    
                    for frame_idx, (frame_data, fps, total_frames) in enumerate(frame_generator):
                        batch.append(frame_data)
                        
                        if len(batch) >= self.config.frame_buffer_limit:
                            batch_results = self._process_and_cleanup_batch(
                                batch, frame_idx, pbar
                            )
                            frame_analyses.extend(batch_results)
                            batch.clear()
                            
                            if self.memory_monitor.check_memory_warning():
                                logger.warning("Memory pressure detected, forcing aggressive cleanup...")
                                self.memory_monitor.force_cleanup(aggressive=True)
                                time.sleep(0.5)
                        
                        if frame_idx > 0 and frame_idx % self.config.memory_cleanup_interval == 0:
                            self.memory_monitor.force_cleanup()
                    
                    if batch:
                        batch_results = self._process_and_cleanup_batch(
                            batch, frame_idx, pbar, is_final=True
                        )
                        frame_analyses.extend(batch_results)
                        batch.clear()
                
                except Exception as e:
                    logger.error(f"Fatal error in streaming analysis: {e}")
                    raise
            
            stage.frames_processed = len(frame_analyses)
        
        self.memory_monitor.force_cleanup(aggressive=True)
        logger.info(f"\n✓ Analysis complete: {len(frame_analyses)} frames")
        
        return frame_analyses

    def _process_and_cleanup_batch(
        self,
        batch: List[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]],
        frame_idx: int,
        pbar: tqdm,
        is_final: bool = False,
    ) -> List[FrameAnalysis]:
        """Process batch and aggressively clean up memory."""
        batch_results: List[FrameAnalysis] = []
        
        try:
            batch_results = self._process_micro_batch(batch)
            pbar.update(len(batch_results))
            self.frames_analyzed += len(batch_results)
                
        except Exception as e:
            logger.error(f"Error processing batch at frame {frame_idx}: {e}")
        finally:
            self._cleanup_batch_frames(batch)
            self.memory_monitor.force_cleanup()
            
            if is_final:
                logger.debug("Final batch processed and cleaned up")
        
        return batch_results
    
    def _cleanup_batch_frames(self, batch: List[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]) -> None:
        """Delete all frame arrays from memory."""
        for frame_data in batch:
            frame_data.pop('frame', None)
            
    def _should_run_plugin(self, plugin: AnalyzerPlugin, frame_idx: int) -> bool:
        """Determine if plugin should run on this frame based on skip interval."""
        plugin_name = plugin.__class__.__name__
        
        critical_plugins = ['ObjectDetectionPlugin', 'FaceRecognitionPlugin']
        if plugin_name in critical_plugins:
            return True
        
        if self.config.plugin_skip_interval is None:
            return True
        skip_interval = self.config.plugin_skip_interval.get(plugin_name, 1)
        
        if plugin_name not in self.plugin_frame_counters:
            self.plugin_frame_counters[plugin_name] = 0
        
        self.plugin_frame_counters[plugin_name] += 1
        
        return self.plugin_frame_counters[plugin_name] % skip_interval == 0
    
    def _process_micro_batch(self, batch: List[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]) -> List[FrameAnalysis]:
        """Process batch through plugins with selective execution."""
        results: List[FrameAnalysis] = [
            {
                'start_time_ms': b['timestamp_ms'],
                'end_time_ms': b['end_timestamp_ms'],
                'duration_ms': b['end_timestamp_ms'] - b['timestamp_ms'],
                'frame_idx': b['frame_idx']
            }
            for b in batch
        ]
        
        for plugin in self.plugins:
            plugin_name = plugin.__class__.__name__
            
            for i in range(len(batch)):
                frame_idx = batch[i]['frame_idx']
                
                if not self._should_run_plugin(plugin, frame_idx):
                    logger.debug(f"Skipping {plugin_name} for frame {frame_idx}")
                    continue
                
                try:
                    plugin_result = self._safe_plugin_call(
                        plugin,
                        batch[i]['frame'],
                        results[i].copy(),
                    )
                    if plugin_result and isinstance(plugin_result, dict):
                        results[i].update(plugin_result)
                        
                except TimeoutError:
                    logger.warning(
                        f"Timeout: Frame {i} in {plugin_name} took too long"
                    )
                except Exception as e:
                    logger.warning(f"Frame {i} failed in {plugin.__class__.__name__}: {e}")

        return results

    def _safe_plugin_call(
        self, plugin: AnalyzerPlugin, frame: np.ndarray, frame_analysis: FrameAnalysis
    ) -> FrameAnalysis:
        """Safely call plugin with error handling."""
        plugin_name = plugin.__class__.__name__

        if plugin_name not in self.plugin_metrics:
            self.plugin_metrics[plugin_name] = []
            self.plugin_errors[plugin_name] = 0
            self.plugin_timeouts[plugin_name] = 0
        
        start_time = time.time()
        
        try:
            result = plugin.analyze_frame(frame, frame_analysis, self.video_path)
            duration_ms = (time.time() - start_time) * 1000
            self.plugin_metrics[plugin_name].append(duration_ms)
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self.plugin_timeouts[plugin_name] += 1
            logger.warning(f"Error in {plugin.__class__.__name__}: {e}")
            return frame_analysis
        
    def _get_plugin_performance_summary(self) -> List[Dict[str, Union[str, int, float]]]:
        """Calculate performance statistics for each plugin."""
        summary = []
        
        for plugin_name, timings in self.plugin_metrics.items():
            if not timings:
                continue
                
            total_duration_s = sum(timings) / 1000
            frames_processed = len(timings)
            avg_time_ms = sum(timings) / len(timings)
            min_time_ms = min(timings)
            max_time_ms = max(timings)
            
            summary.append({
                'plugin_name': plugin_name,
                'total_duration_seconds': round(total_duration_s, 3),
                'frames_processed': frames_processed,
                'avg_time_per_frame_ms': round(avg_time_ms, 2),
                'min_time_ms': round(min_time_ms, 2),
                'max_time_ms': round(max_time_ms, 2),
                'timeout_count': self.plugin_timeouts.get(plugin_name, 0),
                'error_count': self.plugin_errors.get(plugin_name, 0)
            })
        
            summary.sort(key=lambda x: x['total_duration_seconds'], reverse=True)
            return summary
        
    def _run_post_processing(
        self, frame_analyses: List[FrameAnalysis]
    ) -> Tuple[Dict[str, Union[str, int, float, bool, List, Dict]], 
               List[Dict[str, Union[str, int, float]]], Dict[str, Union[str, int, float, List]]]:
        """Execute post-processing plugins."""
        scene_analysis: List[FrameAnalysis] = {}
        detected_activities: List[Dict[str, Union[str, int, float]]] = []
        face_summary: Dict[str, Union[str, int, float, List]] = {}

        logger.info("Running post-processing...")

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_scene'):
                try:
                    plugin.analyze_scene(frame_analyses)
                    results = plugin.get_results()
                    if results:
                        scene_analysis.update(
                            asdict(results) if hasattr(results, '__dataclass_fields__') else results
                        )
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.analyze_scene: {e}")

        for plugin in self.plugins:
            if hasattr(plugin, 'analyze_activities'):
                try:
                    activities = plugin.analyze_activities(frame_analyses, scene_analysis)
                    if activities:
                        detected_activities = [
                            asdict(a) if hasattr(a, '__dataclass_fields__') else a 
                            for a in activities
                        ]
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.analyze_activities: {e}")

        for plugin in self.plugins:
            if hasattr(plugin, 'get_summary'):
                try:
                    summary = plugin.get_summary()
                    if summary and "known_people_identified" in summary:
                        face_summary = summary
                except Exception as e:
                    logger.error(f"Error in {plugin.__class__.__name__}.get_summary: {e}")

        return scene_analysis, detected_activities, face_summary

    def _print_performance_report(self, total_time: float) -> None:
        """Print detailed performance breakdown."""
        for metric in self.metrics:
            logger.info(f"\n{metric.stage.upper()}")
            logger.info(f"  Duration: {metric.duration_seconds:.2f}s")
            
            if metric.frames_processed > 0:
                logger.info(f"  Frames: {metric.frames_processed}")
                logger.info(f"  FPS: {metric.fps:.2f}")
            
            if metric.memory_mb is not None:
                logger.info(f"  Memory Δ: {metric.memory_mb:+.1f} MB")
            
            if metric.peak_memory_mb is not None:
                logger.info(f"  Peak Memory: {metric.peak_memory_mb:.0f} MB")
        plugin_summary = self._get_plugin_performance_summary()
        
        if plugin_summary:
            logger.info("\n" + "="*70)
            logger.info("PLUGIN PERFORMANCE:")
            logger.info("="*70)
            
            total_plugin_time = sum(p['total_duration_seconds'] for p in plugin_summary)
            
            for i, plugin_stats in enumerate(plugin_summary, 1):
                percentage = (plugin_stats['total_duration_seconds'] / total_plugin_time * 100) if total_plugin_time > 0 else 0
                
                logger.info(f"\n  #{i}. {plugin_stats['plugin_name']}")
                logger.info(f"      Total Time: {plugin_stats['total_duration_seconds']:.3f}s ({percentage:.1f}%)")
                logger.info(f"      Frames: {plugin_stats['frames_processed']}")
                logger.info(f"      Avg/Frame: {plugin_stats['avg_time_per_frame_ms']:.2f}ms")
                logger.info(f"      Range: {plugin_stats['min_time_ms']:.2f}ms - {plugin_stats['max_time_ms']:.2f}ms")
                
                if plugin_stats['error_count'] > 0:
                    logger.info(f"      ⚠ Errors: {plugin_stats['error_count']}")
                if plugin_stats['timeout_count'] > 0:
                    logger.info(f"      ⚠ Timeouts: {plugin_stats['timeout_count']}")
            
            logger.info(f"\n  Total Plugin Time: {total_plugin_time:.2f}s")
            logger.info(f"  Overall Processing Time: {total_time:.2f}s")
            overhead = total_time - total_plugin_time
            logger.info(f"  Framework Overhead: {overhead:.2f}s ({overhead/total_time*100:.1f}%)")
        
        logger.info("\n" + "="*70 + "\n")
        
        
    def _create_error_result(self, error: str) -> "VideoAnalysisResult":
        """Create error result object."""
        return VideoAnalysisResult(
            video_file=self.video_path,
            scene_analysis={},
            detected_activities=[],
            face_recognition_summary={},
            frame_analysis=[],
            summary={
                "error": error,
                "peak_memory_mb": self.memory_monitor.peak_memory,
                "memory_cleanups": self.memory_monitor.cleanup_count
            },
            performance_metrics=[asdict(m) for m in self.metrics],
            error=error
        )


class OutputManager:
    """Manages analysis result serialization."""
    
    @staticmethod
    def get_output_path(video_path: str, output_dir: str) -> "Path":
        """Generate output JSON path for video file."""
        video_name = Path(video_path).stem
        return Path(output_dir) / f"{video_name}_analysis.json"
    
    @staticmethod
    def save_result(result: "VideoAnalysisResult", output_path: "Path") -> bool:
        """Save analysis result to JSON file."""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
            
            logger.info(f"\n✓ Results saved to: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"\n✗ Failed to save results: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    @staticmethod
    def print_success_message(output_path: Path) -> None:
        """Print success message with output path."""
        print(str(output_path.absolute()))


def analyze_and_save(video_path: str, output_path: Path, config: AnalysisConfig) -> None:
    """Analyze video and save results to JSON."""
    try:
        analyzer = VideoAnalyzer(video_path, config)
        result = analyzer.analyze()
        
        if result.error:
            logger.error(f"Analysis completed with error: {result.error}")
            OutputManager.save_result(result, output_path)
            sys.exit(1)
        
        success = OutputManager.save_result(result, output_path)
        
        if success:
            OutputManager.print_success_message(output_path)
            sys.exit(0)
        else:
            logger.error("Failed to save analysis results")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Production video analysis with AI-powered frame processing"
    )
    parser.add_argument("video_file", help="Path to video file")
    parser.add_argument("--output", type=Path, help="Custom output file path")
    parser.add_argument("--workers", type=int, help="Number of worker threads")
    parser.add_argument("--buffer", type=int, help="Frame buffer limit")
    parser.add_argument("--interval", type=float, help="Sample interval in seconds")
    parser.add_argument("--cleanup", type=int, help="Force cleanup every N frames")
    parser.add_argument("--no-report", action="store_true", help="Disable performance report")
    parser.add_argument("--no-aggressive-gc", action="store_true", help="Disable aggressive GC")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--fast", action="store_true", help="Enable all speed optimizations")

    args = parser.parse_args()
    
    if not Path(args.video_file).exists():
        logger.error(f"Video file not found: {args.video_file}")
        sys.exit(1)
    
    config = AnalysisConfig()
    
    if args.workers:
        config.max_workers = args.workers
    if args.buffer:
        config.frame_buffer_limit = args.buffer
    if args.interval:
        config.sample_interval_seconds = args.interval
    if args.cleanup:
        config.memory_cleanup_interval = args.cleanup
    if args.no_report:
        config.enable_performance_report = False
    if args.no_aggressive_gc:
        config.enable_aggressive_gc = False
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.fast:
        config.sample_interval_seconds = 3.0  # Sample every 3 seconds instead of 2
        config.target_resolution_height = 480  # Lower resolution
        config.frame_buffer_limit = 4  # Smaller batches
        config.plugin_skip_interval = {
            'TextDetectionPlugin': 5,
            'EmotionDetectionPlugin': 3,
            'DominantColorPlugin': 3,
        }
        logger.info("⚡ Fast mode enabled - trading some accuracy for speed")
    
        
    output_path = args.output or OutputManager.get_output_path(
        args.video_file, 
        config.output_dir
    )
    

    try:
        analyze_and_save(args.video_file, output_path, config)
    except KeyboardInterrupt:
        logger.error("\n\nAnalysis interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()