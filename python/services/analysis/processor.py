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
        self._used_cuda = False
        self.metrics = {
            "video_open_time": 0.0,
            "frame_decode_time": 0.0,
            "total_extraction_time": 0.0,
            "frames_extracted": 0
        }

    def _open_container(self, video_path: str, force_cpu: bool = False):
        """Open video container with broad codec support. CUDA-accelerated where possible, CPU fallback."""
        start_open = time.time()

        CUDA_CODEC_MAP = {
            "hevc": "hevc_cuvid",
            "h264": "h264_cuvid",
            "vp9": "vp9_cuvid",
            "vp8": "vp8_cuvid",
            "av1": "av1_cuvid",
            "mpeg2video": "mpeg2_cuvid",
            "mpeg4": "mpeg4_cuvid",
            "mjpeg": "mjpeg_cuvid",
            "vc1": "vc1_cuvid",
        }

        def _detect_codec(video_path: str) -> str:
            """Detect the video codec without fully opening the container."""
            try:
                probe = av.open(video_path)
                codec = probe.streams.video[0].codec_context.name
                probe.close()
                return codec
            except Exception:
                return "unknown"

        def _open_cpu(video_path: str) -> av.container.InputContainer:
            # Note: these are demuxer options — "threads" here does not reach
            # the decoder (verified: codec_context.thread_count stays 0). Real
            # decoder threading is controlled by stream.thread_type below.
            return av.open(video_path)

        codec_name = _detect_codec(video_path)
        logger.info(f"Detected video codec: {codec_name}")

        self._used_cuda = False

        if self.config.device == "cuda" and self.config.use_gpu_frame_decode and not force_cpu:
            cuda_codec = CUDA_CODEC_MAP.get(codec_name)
            if cuda_codec:
                try:
                    container = av.open(
                        video_path,
                        options={
                            "hwaccel": "cuda",
                            "hwaccel_output_format": "cuda",
                            "vcodec": cuda_codec,
                        }
                    )
                    # These are demuxer options, so they do not actually select
                    # a decoder — without this check the log claimed hardware
                    # decoding while libavcodec silently used the software one.
                    selected = container.streams.video[0].codec_context.name
                    if selected == cuda_codec:
                        self.metrics["video_open_time"] += time.time() - start_open
                        self._used_cuda = True
                        logger.info(f"Using CUDA acceleration: {cuda_codec}")
                        return container
                    logger.warning(
                        f"Requested {cuda_codec} but libavcodec selected '{selected}'; "
                        f"hardware decoding is not active. Falling back to CPU."
                    )
                    container.close()
                except Exception as e:
                    logger.warning(f"CUDA failed for {cuda_codec}: {e}. Falling back to CPU.")
            else:
                logger.warning(f"No CUDA decoder for codec '{codec_name}', using CPU.")

        # CPU fallback — PyAV auto-selects the right decoder for all codecs
        try:
            container = _open_cpu(video_path)
            self.metrics["video_open_time"] += time.time() - start_open
            logger.info(f"Opened with CPU decoder: {codec_name}")
            return container
        except Exception as e:
            raise AnalysisError(f"Failed to open video (codec: {codec_name}): {e}")
            
    def extract_frames_streaming(
        self,
        video_path: str,
        job_id: str,
        cancel_flag=None,
    ) -> Iterator[Dict[str, Union[np.ndarray, int, float, Tuple[int, int]]]]:

        start_total = time.time()
        container = None

        try:
            container = self._open_container(video_path)
            stream = container.streams.video[0]
            stream.thread_type = "NONE"
            stream.codec_context.skip_frame = "NONREF"

            fps = float(stream.average_rate) if stream.average_rate else 30.0
            total_video_frames = stream.frames

            if total_video_frames <= 0:
                if stream.duration and stream.time_base:
                    duration_sec = float(stream.duration * stream.time_base)
                    total_video_frames = int(duration_sec * fps)
                if total_video_frames <= 0:
                    raise AnalysisError("Cannot determine frame count or duration")

            video_duration_seconds = total_video_frames / fps

            if video_duration_seconds < 90:
                sample_interval = max(1, int(fps))
            else:
                sample_interval = max(1, int(fps * self.config.sample_interval_seconds))

            sample_interval_sec = sample_interval / fps
            total_sampled_frames = (total_video_frames + sample_interval - 1) // sample_interval

            # Sequential decoding walks every frame to keep 1 in sample_interval,
            # so it only pays off when we're sampling densely enough that seeking
            # per sample would cost more than decoding straight through.
            #
            # The old rule (duration < 120s) was off by two orders of magnitude
            # for this footage: on a 102s 4K 10-bit HEVC clip, sequential decoded
            # 5100 frames in 277s to yield 41 samples (6.77s/sample), while seek
            # produced the same 40 samples in 3.9s (0.10s/sample) — 71x faster.
            use_sequential = sample_interval <= 4

            logger.info(
                f"Video: {total_video_frames} frames, fps={fps:.2f}, "
                f"codec={stream.codec_context.name}, duration={video_duration_seconds:.1f}s, "
                f"strategy={'sequential' if use_sequential else 'seek'}, "
                f"sampling every {sample_interval} frames (~{sample_interval_sec:.2f}s)"
            )

            sampled_frame_number = 0
            consecutive_failures = 0
            MAX_CONSECUTIVE_FAILURES = 10

            if use_sequential:
                for frame in container.decode(stream):
                    if cancel_flag and cancel_flag.is_set():
                        logger.info(f"[{job_id}] Extraction cancelled")
                        return

                    if frame.pts is None:
                        continue

                    # Only yield frames that fall on a sample boundary
                    frame_number = round(float(frame.pts * frame.time_base) * fps)
                    if frame_number % sample_interval != 0:
                        continue

                    timestamp_sec = float(frame.pts * frame.time_base)

                    start_decode = time.time()
                    img = frame.to_ndarray(format="bgr24")
                    original_h, original_w = img.shape[:2]
                    original_frame = img.copy()

                    if original_h > self.config.target_resolution_height:
                        target_h = self.config.target_resolution_height
                        target_w = int(original_w * (target_h / original_h))
                        frame = frame.reformat(width=target_w, height=target_h, format="bgr24")
                        img = frame.to_ndarray(format="bgr24")
                        scale_factor = original_h / target_h
                    else:
                        scale_factor = 1.0

                    self.metrics["frame_decode_time"] += time.time() - start_decode

                    sampled_frame_number += 1

                    yield {
                        'frame': img,
                        'timestamp_ms': round(timestamp_sec * 1000),
                        'end_timestamp_ms': round((timestamp_sec + sample_interval_sec) * 1000),
                        'frame_idx': frame.pts,
                        'scale_factor': scale_factor,
                        'original_size': (original_w, original_h),
                        'job_id': job_id,
                        'total_frames': total_sampled_frames,
                        'total_video_frames': total_video_frames,
                        'fps': fps,
                        'sample_interval': sample_interval,
                        'sampled_frame_number': sampled_frame_number,
                        'original_frame': original_frame
                    }

            else:
                FRAME_DECODE_TIMEOUT = 15

                i = 0
                while i < total_sampled_frames:
                    if cancel_flag and cancel_flag.is_set():
                        logger.info(f"[{job_id}] Extraction cancelled at frame {i}/{total_sampled_frames}")
                        return

                    target_time_sec = i * sample_interval_sec
                    seek_pts = int(target_time_sec / stream.time_base)

                    try:
                        container.seek(seek_pts, any_frame=False, backward=True, stream=stream)
                    except Exception as e:
                        logger.warning(f"[{job_id}] Seek failed at {target_time_sec:.2f}s: {e}")
                        consecutive_failures += 1
                        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                            if self._used_cuda:
                                logger.warning(f"[{job_id}] CUDA decoder causing seek failures, reopening with CPU")
                                container.close()
                                container = self._open_container(video_path, force_cpu=True)
                                stream = container.streams.video[0]
                                stream.thread_type = "NONE"
                                stream.codec_context.skip_frame = "NONREF"
                                consecutive_failures = 0
                                i = 0
                                continue
                            raise AnalysisError(f"Aborting: {MAX_CONSECUTIVE_FAILURES} consecutive seek failures")
                        i += 1
                        continue

                    frame_found = False
                    decode_start = time.time()

                    try:
                        for frame in container.decode(stream):
                            if time.time() - decode_start > FRAME_DECODE_TIMEOUT:
                                logger.warning(f"[{job_id}] Decode timeout at {target_time_sec:.2f}s, skipping")
                                break

                            if frame.pts is None:
                                continue

                            timestamp_sec = float(frame.pts * frame.time_base)
                            if timestamp_sec < target_time_sec - (sample_interval_sec * 0.5):
                                continue

                            start_decode = time.time()
                            img = frame.to_ndarray(format="bgr24")
                            original_h, original_w = img.shape[:2]
                            original_frame = img.copy()

                            if original_h > self.config.target_resolution_height:
                                target_h = self.config.target_resolution_height
                                target_w = int(original_w * (target_h / original_h))
                                frame = frame.reformat(width=target_w, height=target_h, format="bgr24")
                                img = frame.to_ndarray(format="bgr24")
                                scale_factor = original_h / target_h
                            else:
                                scale_factor = 1.0

                            self.metrics["frame_decode_time"] += time.time() - start_decode

                            sampled_frame_number += 1
                            consecutive_failures = 0
                            frame_found = True

                            yield {
                                'frame': img,
                                'timestamp_ms': round(timestamp_sec * 1000),
                                'end_timestamp_ms': round((timestamp_sec + sample_interval_sec) * 1000),
                                'frame_idx': frame.pts,
                                'scale_factor': scale_factor,
                                'original_size': (original_w, original_h),
                                'job_id': job_id,
                                'total_frames': total_sampled_frames,
                                'total_video_frames': total_video_frames,
                                'fps': fps,
                                'sample_interval': sample_interval,
                                'sampled_frame_number': sampled_frame_number,
                                'original_frame': original_frame
                            }

                            break

                    except Exception as e:
                        logger.warning(f"Decode error at {target_time_sec:.2f}s: {e}")
                        consecutive_failures += 1
                        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                            if self._used_cuda:
                                logger.warning(f"[{job_id}] CUDA decoder causing decode failures, reopening with CPU")
                                container.close()
                                container = self._open_container(video_path, force_cpu=True)
                                stream = container.streams.video[0]
                                stream.thread_type = "NONE"
                                stream.codec_context.skip_frame = "NONREF"
                                consecutive_failures = 0
                                i = 0
                                continue
                            raise AnalysisError(f"Aborting: {MAX_CONSECUTIVE_FAILURES} consecutive decode failures")
                        i += 1
                        continue

                    if not frame_found:
                        logger.debug(f"[{job_id}] No frame at {target_time_sec:.2f}s, skipping")

                    i += 1

            self.metrics["frames_extracted"] = sampled_frame_number
            self.metrics["total_extraction_time"] = time.time() - start_total

            logger.info(
                f"Extracted {sampled_frame_number}/{total_sampled_frames} frames "
                f"in {self.metrics['total_extraction_time']:.2f}s"
            )

        except Exception as e:
            logger.error(f"[{job_id}] Frame extraction failed: {e}")
            raise AnalysisError(f"Frame extraction failed: {e}")

        finally:
            if container:
                try:
                    container.close()
                except Exception:
                    pass
                    
    def get_metrics(self) -> Dict[str, float]:
        """Return extraction performance metrics."""
        return self.metrics.copy()