"""Transcription service."""
import json
import time
from pathlib import Path
from typing import Optional, Callable

from core.types import TranscriptionRequest
from core.config import TranscriptionConfig
from core.errors import TranscriptionError
from services.base_service import BaseProcessingService
from services.transcription.model import WhisperModelManager
from services.transcription.result import TranscriptionResult, Segment, Word
from services.logger import get_logger

logger = get_logger(__name__)


class TranscriptionService(BaseProcessingService[TranscriptionRequest, TranscriptionResult]):
    """Video transcription service using Whisper."""

    def __init__(self, config: Optional[TranscriptionConfig] = None):
        self.config = config or TranscriptionConfig()

        super().__init__(
            max_workers=2,  # Transcription is GPU-intensive
            enable_memory_monitoring=True
        )

        self.model_manager = WhisperModelManager(self.config)

    def _process_sync(
        self,
        request: TranscriptionRequest,
        progress_callback: Optional[Callable] = None
    ) -> TranscriptionResult:
        """Synchronous transcription implementation."""
        logger.info(f"Starting transcription: {request.video_path}")
        start_time = time.time()
        try:
            # Get model (loads if needed)
            model = self.model_manager.get_model()

            # Transcribe
            result = self._transcribe_video(
                model,
                request.video_path,
                progress_callback
            )

            # Final progress update
            if progress_callback:
                elapsed = time.time() - start_time
                progress_callback(100, self._format_time(elapsed))

            logger.info(
                f"Transcription completed in {time.time() - start_time:.1f}s")
            return result

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise TranscriptionError(f"Transcription failed: {e}")

    def _transcribe_video(
        self,
        model,
        video_path: str,
        progress_callback: Optional[Callable]
    ) -> TranscriptionResult:
        """Transcribe video with progress updates."""
        try:
            start = time.time()

            segments, info = model.transcribe(
                video_path,
                beam_size=self.config.beam_size,
                word_timestamps=True,
                vad_filter=self.config.vad_filter,
                log_progress=False,
                vad_parameters={
                    "threshold": self.config.vad_threshold,
                    "min_speech_duration_ms": self.config.min_speech_duration_ms,
                    "min_silence_duration_ms": self.config.min_silence_duration_ms
                }
            )

            # Process segments
            result_segments = []
            full_text = ""
            processed_duration = 0.0
            total_duration = info.duration if info else 0.0

            for seg in segments:
                # Create segment
                segment = Segment(
                    id=seg.id,
                    start=seg.start,
                    end=seg.end,
                    text=seg.text.strip(),
                    confidence=getattr(seg, 'avg_logprob', None),
                    words=[
                        Word(
                            start=w.start,
                            end=w.end,
                            word=w.word,
                            confidence=getattr(w, 'probability', None)
                        )
                        for w in (seg.words or [])
                    ]
                )

                result_segments.append(segment)
                full_text += seg.text + " "

                # Update progress
                processed_duration += (seg.end - seg.start)
                if progress_callback and total_duration > 0:
                    percent = min(
                        100, (processed_duration / total_duration) * 100)
                    progress_callback(
                        int(percent),
                        self._format_time(processed_duration)
                    )
            end = time.time()
            processing_time = end - start
            return TranscriptionResult(
                text=full_text.strip(),
                segments=result_segments,
                language=info.language if info else None,
                processing_time=processing_time
            )

        except (RuntimeError, IndexError) as e:
            error_msg = str(e).lower()
            if any(x in error_msg for x in ["no audio", "failed to load", "tuple index"]):
                logger.warning(f"No audio in video: {video_path}")
                return TranscriptionResult(text='', segments=[], language='N/A')
            raise

    def save_result(self, result: TranscriptionResult, output_path: str) -> None:
        """Save transcription result to JSON."""
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result.to_dict(), f, indent=4, ensure_ascii=False)

            logger.info(f"Transcription saved: {output_path}")
        except Exception as e:
            logger.error(f"Failed to save transcription: {e}")
            raise TranscriptionError(f"Failed to save transcription: {e}")

    @staticmethod
    def _format_time(seconds: float) -> str:
        """Format seconds as MM:SS."""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"
