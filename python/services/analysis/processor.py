"""Frame extraction and preprocessing."""
from typing import Iterator, Tuple, Dict, Union
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
            "frame_decode_time": 0.0,
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
                video_path,
                options={
                    "threads": "auto",        
                    "thread_type": "frame",    
                }
            )
            self.metrics["video_open_time"] += time.time() - start_open
            return container
            
    def extract_frames_streaming(
        self,
        video_path: str,
        job_id: str
    ) -> Iterator[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]:

        start_total = time.time()

        try:
            container = self._open_container(video_path)
            stream = container.streams.video[0]
            stream.thread_type = "AUTO"

            fps = float(stream.average_rate) if stream.average_rate else 30.0
            total_video_frames = stream.frames

            if total_video_frames <= 0:
                raise AnalysisError("Cannot determine frame count")

            video_duration_seconds = total_video_frames / fps

            if video_duration_seconds < 90:
                sample_interval = max(1, int(fps))
            else:
                sample_interval = max(
                    1, int(fps * self.config.sample_interval_seconds)
                )

            sample_interval_sec = sample_interval / fps
            total_sampled_frames = (
                total_video_frames + sample_interval - 1
            ) // sample_interval

            logger.info(
                f"Video info: {total_video_frames} total frames, "
                f"sampling every {sample_interval} frames "
                f"(~{sample_interval_sec:.2f}s)"
            )

            sampled_frame_number = 0

            for i in range(total_sampled_frames):
                target_time_sec = i * sample_interval_sec

                # Convert seconds to stream time base
                seek_pts = int(target_time_sec / stream.time_base)

                container.seek(
                    seek_pts,
                    any_frame=False,
                    backward=True,
                    stream=stream
                )

                for frame in container.decode(stream):
                    timestamp_sec = float(frame.pts * frame.time_base)

                    if timestamp_sec < target_time_sec:
                        continue

                    start_decode = time.time()

                    img = frame.to_ndarray(format="bgr24")
                    original_h, original_w = img.shape[:2]

                    if original_h > self.config.target_resolution_height:
                        target_h = self.config.target_resolution_height
                        target_w = int(original_w * (target_h / original_h))

                        frame = frame.reformat(
                            width=target_w,
                            height=target_h,
                            format="bgr24"
                        )
                        img = frame.to_ndarray(format="bgr24")
                        scale_factor = original_h / target_h
                    else:
                        scale_factor = 1.0

                    self.metrics["frame_decode_time"] += (
                        time.time() - start_decode
                    )

                    timestamp_ms = round(timestamp_sec * 1000)
                    end_timestamp_ms = round(
                        (timestamp_sec + sample_interval_sec) * 1000
                    )

                    sampled_frame_number += 1

                    yield {
                        'frame': img,
                        'timestamp_ms': timestamp_ms,
                        'end_timestamp_ms': end_timestamp_ms,
                        'frame_idx': frame.pts,
                        'scale_factor': scale_factor,
                        'original_size': (original_w, original_h),
                        'job_id': job_id,
                        'total_frames': total_sampled_frames,
                        'total_video_frames': total_video_frames,
                        'fps': fps,
                        'sample_interval': sample_interval,
                        'sampled_frame_number': sampled_frame_number
                    }

                    break  # stop decoding until next seek

            container.close()

            self.metrics["frames_extracted"] = sampled_frame_number
            self.metrics["total_extraction_time"] = time.time() - start_total

        except Exception as e:
            logger.error(f"Frame extraction error: {e}")
            raise AnalysisError(f"Frame extraction failed: {e}")
            
    def get_metrics(self) -> Dict[str, float]:
        """Return extraction performance metrics."""
        return self.metrics.copy()