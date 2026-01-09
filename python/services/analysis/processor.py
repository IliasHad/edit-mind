"""Frame extraction and preprocessing."""
from typing import Iterator, Tuple, Dict, Union
import cv2
import numpy as np

from core.config import AnalysisConfig
from core.errors import AnalysisError
from services.logger import get_logger

logger = get_logger(__name__)


class FrameProcessor:
    """Extracts and preprocesses video frames."""

    def __init__(self, config: AnalysisConfig):
        self.config = config

    def extract_frames_streaming(
        self,
        video_path: str,
        job_id: str
    ) -> Iterator[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]:
        """
        Stream video frames with preprocessing.

        Yields frame data dictionaries with processed frames.
        """
        cap = cv2.VideoCapture(video_path)

        try:
            if not cap.isOpened():
                raise AnalysisError(f"Cannot open video: {video_path}")

            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps is None or fps <= 0:
                logger.warning("Invalid FPS, defaulting to 30")
                fps = 30.0

            total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
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

            # TODO: make the sample internal short for very short videos to process more video frames

            # Calculate actual number of frames that will be sampled
            total_sampled_frames = (
                total_video_frames + sample_interval - 1) // sample_interval

            logger.info(
                f"Video info: {total_video_frames} total frames, "
                f"sampling every {sample_interval} frames ({fps * self.config.sample_interval_seconds:.1f}s), "
                f"will process ~{total_sampled_frames} frames"
            )

            frame_count = 0

            # Extract frames at intervals
            for frame_idx in range(0, total_video_frames, sample_interval):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if not ret:
                    logger.warning(f"Failed to read frame at {frame_idx}")
                    break

                # Preprocess frame
                processed_frame, scale_factor, original_size = self._preprocess_frame(
                    frame)

                # Calculate timestamps
                timestamp_ms = round((frame_idx / fps) * 1000)
                next_frame_idx = min(
                    frame_idx + sample_interval, total_video_frames)
                end_timestamp_ms = round((next_frame_idx / fps) * 1000)

                frame_count += 1

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
                    'sampled_frame_number': frame_count
                }

                # Cleanup
                del frame

            logger.info(f"Extraction complete: {frame_count} frames extracted")

        except Exception as e:
            logger.error(f"Frame extraction error: {e}")
            raise AnalysisError(f"Frame extraction failed: {e}")
        finally:
            if cap is not None:
                cap.release()

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
                interpolation=cv2.INTER_LINEAR
            )

            scale_factor = original_h / target_h
            return resized, scale_factor, (original_w, original_h)

        return frame.copy(), 1.0, (original_w, original_h)
