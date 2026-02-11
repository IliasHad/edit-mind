"""Video analysis service."""
from typing import Optional, Callable, List
from pathlib import Path
import time

from core.types import AnalysisRequest, FrameAnalysis
from core.config import AnalysisConfig
from core.errors import AnalysisError
from services.base_service import BaseProcessingService
from services.analysis.processor import FrameProcessor
from services.analysis.plugins import PluginManager
from services.analysis.result import VideoAnalysisResult, ResultBuilder
from monitoring.metrics import PerformanceMetrics, StageTimer, StageMetricsCollector
from services.logger import get_logger
import os
import numpy as np
import cv2
import hashlib

logger = get_logger(__name__)


class AnalysisService(BaseProcessingService[AnalysisRequest, VideoAnalysisResult]):
    """Video analysis service with plugin support."""

    def __init__(self, config: Optional[AnalysisConfig] = None):
        self.config = config or AnalysisConfig()

        super().__init__(
            max_workers=self.config.max_workers // 2,
            enable_memory_monitoring=True
        )

        self.frame_processor = FrameProcessor(self.config)
        self.plugin_manager = PluginManager(self.config)
        self.performance_metrics: List[PerformanceMetrics] = []
        self.metrics_collector = StageMetricsCollector()

        extraction_metrics = self.frame_processor.get_metrics()

        self.metrics_collector.record_execution(
            "frame_extraction",
            extraction_metrics["total_extraction_time"]
        )
    
    def _process_sync(
        self,
        request: AnalysisRequest,
        progress_callback: Optional[Callable] = None
    ) -> VideoAnalysisResult:
        """Synchronous analysis implementation."""
        start_time = time.time()

        try:
            # Setup plugins
            with StageTimer("plugin_setup") as timer:
                self.plugin_manager.setup_plugins(
                    request.video_path, request.job_id)
            self._record_stage_metric(timer)
            self.metrics_collector.record_execution("plugin_setup", time.time() - start_time)

            # Analyze frames
            frame_analyses = self._analyze_frames(
                request,
                progress_callback
            )
            self.metrics_collector.record_execution("frame_analysis", time.time() - start_time)
            # Build result
            result = ResultBuilder.build_success_result(
                video_path=request.video_path,
                frame_analyses=frame_analyses,
                plugin_metrics=self.plugin_manager.get_metrics(),
                performance_metrics=self.performance_metrics,
                memory_stats=self.memory_monitor.get_stats() if self.memory_monitor else {},
                processing_time=time.time() - start_time,
                stage_metrics=self.metrics_collector.get_metrics()
            )
            
            # Rest plugin metrics after each video has been processed
            self.plugin_manager.reset_metrics()
            self.metrics_collector = StageMetricsCollector()

            return result

        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return ResultBuilder.build_error_result(
                video_path=request.video_path,
                error=str(e),
                memory_stats=self.memory_monitor.get_stats() if self.memory_monitor else {}
            )

    def _analyze_frames(
        self,
        request: AnalysisRequest,
        progress_callback: Optional[Callable]
    ) -> List[FrameAnalysis]:
        """Analyze video frames with plugins."""
        frame_analyses: List[FrameAnalysis] = []
        batch: List = []

        # Track progress
        total_frames_estimate = None
        frames_processed = 0
        thumbnail_total_time = 0
        
        with StageTimer("frame_analysis") as timer:
            frame_generator = self.frame_processor.extract_frames_streaming(
                request.video_path,
                request.job_id
            )

            for frame_idx, frame_data in enumerate(frame_generator):
                # Get total frames from first frame
                if total_frames_estimate is None:
                    total_frames_estimate = frame_data.get('total_frames', 0)

                batch.append(frame_data)

                # Process batch when buffer is full
                if len(batch) >= self.config.frame_buffer_limit:
                    batch_results = self._process_batch(
                        batch, request.video_path)
                    frame_analyses.extend(batch_results)
                    frames_processed += len(batch_results)
                    batch.clear()

                    # Send progress update
                    if progress_callback and total_frames_estimate:
                        self._send_progress(
                            progress_callback,
                            frames_processed,
                            total_frames_estimate,
                            time.time() - timer.start_time
                        )

                    # Memory cleanup
                    if self.memory_monitor:
                        if frame_idx % self.config.memory_cleanup_interval == 0:
                            self.memory_monitor.force_cleanup()

                        if self.memory_monitor.check_memory_pressure():
                            logger.warning("Memory pressure detected")
                            self.memory_monitor.force_cleanup(aggressive=True)
                            time.sleep(0.5)

            # Process remaining batch
            if batch:
                batch_results = self._process_batch(batch, request.video_path)
                frame_analyses.extend(batch_results)
                frames_processed += len(batch_results)

                # Final progress update
                if progress_callback and total_frames_estimate:
                    self._send_progress(
                        progress_callback,
                        frames_processed,
                        total_frames_estimate,
                        time.time() - timer.start_time
                    )

        self._record_stage_metric(timer, frames_processed=len(frame_analyses))
        self.plugin_manager.cleanup_plugins()
        logger.info(
            f"Completed analysis: {len(frame_analyses)} frames processed")
        return frame_analyses

    def _process_batch(self, batch: List, video_path: str) -> List[FrameAnalysis]:
        """Process a batch of frames through plugins."""
        results: List[FrameAnalysis] = []
        video_hash = hashlib.md5(video_path.encode('utf-8')).hexdigest()

        for frame_data in batch:
            # Initialize frame analysis
            frame_idx = frame_data['frame_idx']
            thumbnail_path = os.path.join(self.config.thumbnail_dir, f"${video_hash}_{frame_idx}.jpeg")
            analysis: FrameAnalysis = {
                'start_time_ms': frame_data['timestamp_ms'],
                'end_time_ms': frame_data['end_timestamp_ms'],
                'duration_ms': frame_data['end_timestamp_ms'] - frame_data['timestamp_ms'],
                'frame_idx': frame_data['frame_idx'],
                'scale_factor': frame_data['scale_factor'],
                'job_id': frame_data['job_id'],
                'thumbnail_path': thumbnail_path
            }

            # Run plugins
            analysis = self.plugin_manager.process_frame(
                frame_data['frame'],
                analysis,
                frame_data['frame_idx'],
                video_path
            )
            start_thumb = time.time()
            self.save_frame(thumbnail_path, frame_data['frame'])
            self.metrics_collector.record_execution("thumbnail_extraction", time.time() - start_thumb)

            results.append(analysis)

        # Cleanup frames from memory
        for frame_data in batch:
            frame_data.pop('frame', None)

        return results

    def _send_progress(
        self,
        callback: Callable,
        frames_processed: int,
        total_frames: int,
        elapsed: float
    ) -> None:
        """Send progress update with proper percentage calculation."""
        try:
            logger.debug(
                f"frames_processed: {frames_processed}, total_frames: {total_frames}")
            # Calculate progress percentage (0-100)
            if total_frames > 0:
                progress_percent = min(
                    100.0, (frames_processed / total_frames) * 100.0)
            else:
                progress_percent = 0.0

            # Round to 1 decimal place
            progress_percent = round(progress_percent, 1)

            # Call callback with: progress%, elapsed time, processed count, total count
            callback(
                progress_percent,
                round(elapsed, 2),
                float(frames_processed),
                float(total_frames)
            )

            # Log every 10%
            if int(progress_percent) % 10 == 0:
                logger.debug(
                    f"Analysis progress: {progress_percent:.1f}% "
                    f"({frames_processed}/{total_frames} frames, {elapsed:.1f}s elapsed)"
                )

        except Exception as e:
            logger.warning(f"Progress callback error: {e}")

    def _record_stage_metric(
        self,
        timer: StageTimer,
        frames_processed: int = 0
    ) -> None:
        """Record performance metric for a stage."""
        fps = frames_processed / timer.duration if timer.duration > 0 else 0.0
        memory_mb = self.memory_monitor.get_memory_mb() if self.memory_monitor else 0.0
        peak_mb = self.memory_monitor.peak_memory_mb if self.memory_monitor else 0.0

        metric = PerformanceMetrics(
            stage=timer.stage_name,
            duration_seconds=timer.duration,
            frames_processed=frames_processed,
            fps=fps,
            memory_mb=memory_mb,
            peak_memory_mb=peak_mb
        )

        self.performance_metrics.append(metric)

    def save_result(self, result: VideoAnalysisResult, output_path: str) -> None:
        """Save analysis result to JSON file."""
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            import json
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

            logger.info(f"Results saved to: {output_path}")
        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            raise AnalysisError(f"Failed to save results: {e}")
        
    def save_frame(self, thumbnail_path: str, frame: np.ndarray) -> None:
        """Save frame resized as scene thumbnail """
        try:
            os.makedirs(self.config.thumbnail_dir, exist_ok=True)

            h, w = frame.shape[:2]
            target_width = 320
            scale = target_width / w
            target_height = int(h * scale)

            resized_frame = cv2.resize(
                frame,
                (target_width, target_height),
                interpolation=cv2.INTER_AREA
            )

            cv2.imwrite(thumbnail_path, resized_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

        except Exception as e:
            logger.error(f"Failed to save frame: {e}")
            raise AnalysisError(f"Failed to save frame: {e}")