"""Frame extraction and preprocessing."""
from typing import Iterator, Tuple, Dict, Union
import cv2
import numpy as np
import av
import time

from core.config import AnalysisConfig
from core.errors import AnalysisError
from services.logger import get_logger
import time

logger = get_logger(__name__)


class FrameProcessor:
    """Extracts and preprocesses video frames."""

    def __init__(self, config: AnalysisConfig):
        self.config = config
        self.metrics = {
            "video_open_time": 0.0,
            "metadata_read_time": 0.0,
            "frame_decode_time": 0.0,
            "preprocess_time": 0.0,
            "total_extraction_time": 0.0,
            "frames_extracted": 0
        }

    def _open_container(self, video_path: str):
        """Try CUDA first, fallback to CPU."""
        start_open = time.time()
        
        if self.config.device == "cuda":
            try:
                container = av.open(
                    video_path,
                    options={
                        "hwaccel": "cuda",
                        "hwaccel_output_format": "cuda"
                    }
                )
                self.metrics["video_open_time"] += time.time() - start_open
                logger.info("Using CUDA hardware acceleration (NVDEC)")
                return container

            except Exception:
                logger.warning("CUDA not available, falling back to CPU decoding")
                container = av.open(video_path)
                self.metrics["video_open_time"] += time.time() - start_open
                return container
        else:
            container = av.open(
                video_path
            )
            self.metrics["video_open_time"] += time.time() - start_open
            return container
            
    def extract_frames_streaming(
        self,
        video_path: str,
        job_id: str
    ) -> Iterator[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]:
        """
        Stream video frames with preprocessing.

        Yields frame data dictionaries with processed frames.
        """
        start_total = time.time()

        try:
            container = self._open_container(video_path)

            stream = container.streams.video[0]
            stream.thread_type = "AUTO" 


            fps = float(stream.average_rate) if stream.average_rate else 30.0
            total_video_frames = stream.frames

            if total_video_frames <= 0:
                raise AnalysisError("Cannot determine frame count")

            # Calculate video duration
            video_duration_seconds = total_video_frames / fps

            # Adaptive sampling: use 1 frame per second for videos under 90 seconds
            if video_duration_seconds < 90:
                sample_interval = max(1, int(fps))  # 1 frame per second
                logger.info(
                    f"Short video detected ({video_duration_seconds:.1f}s), using 1 frame/second sampling")

            else:
                sample_interval = max(
                    1, int(fps * self.config.sample_interval_seconds))


            # Calculate actual number of frames that will be sampled
            total_sampled_frames = (
                total_video_frames + sample_interval - 1) // sample_interval
            
            actual_seconds = sample_interval / fps

            logger.info(
                f"Video info: {total_video_frames} total frames, "
                f"sampling every {sample_interval} frames (~{actual_seconds:.2f}s), "
                f"will process ~{total_sampled_frames} frames"
            )
            

            frame_idx = 0
            sampled_frame_number = 0
            next_sample_time = 0.0  # seconds
            sample_interval_sec = sample_interval / fps

           # Extract frames at intervals
            for frame in container.decode(stream):
                start_decode = time.time()
                timestamp_sec = float(frame.pts * frame.time_base)
                
                # Use small tolerance to handle floating-point comparison
                if timestamp_sec < next_sample_time - 0.001:  # 1ms tolerance
                    frame_idx += 1
                    continue 
                
                img = frame.to_ndarray(format="bgr24")
                
                self.metrics["frame_decode_time"] += (
                    time.time() - start_decode
                )

                start_pre = time.time()
                processed_frame, scale_factor, original_size = \
                    self._preprocess_frame(img)
                self.metrics["preprocess_time"] += (
                    time.time() - start_pre
                )
                # Calculate timestamps
                timestamp_ms = round(timestamp_sec * 1000) 
                end_timestamp_ms = round((timestamp_sec + sample_interval_sec) * 1000)

                sampled_frame_number += 1

                yield {
                    'frame': processed_frame,
                    'timestamp_ms': timestamp_ms,
                    'end_timestamp_ms': end_timestamp_ms,
                    'frame_idx': frame_idx,
                    'scale_factor': scale_factor,
                    'original_size': original_size,
                    'job_id': job_id,
                    'total_frames': total_sampled_frames,
                    'total_video_frames': total_video_frames,
                    'fps': fps,
                    'sample_interval': sample_interval,
                    'sampled_frame_number': sampled_frame_number
                }
                
                next_sample_time += sample_interval_sec 
                frame_idx += 1

            # Cleanup
            container.close()

            logger.info(f"Extraction complete: {sampled_frame_number} frames extracted")
            self.metrics["frames_extracted"] = sampled_frame_number
            self.metrics["total_extraction_time"] = time.time() - start_total
            logger.info(f"Total extraction time: {self.metrics['total_extraction_time']:.2f}s")
        except Exception as e:
            logger.error(f"Frame extraction error: {e}")
            raise AnalysisError(f"Frame extraction failed: {e}")

    def _preprocess_frame(
        self,
        frame: np.ndarray
    ) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """
        Resize frame for optimal processing.

        Returns:
            Tuple of (processed_frame, scale_factor, original_size)
        """
        if frame is None:
            raise ValueError("Received None frame")

        original_h, original_w = frame.shape[:2]

        # Resize if needed
        if original_h > self.config.target_resolution_height:
            target_h = self.config.target_resolution_height
            target_w = int(original_w * (target_h / original_h))

            resized = cv2.resize(
                frame,
                (target_w, target_h),
                interpolation=cv2.INTER_AREA
            )

            scale_factor = original_h / target_h
            return resized, scale_factor, (original_w, original_h)

        return frame, 1.0, (original_w, original_h)
    def get_metrics(self) -> Dict[str, float]:
        """Return extraction performance metrics."""
        return self.metrics.copy()