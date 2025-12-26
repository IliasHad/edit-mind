import sys
import io
import json
import logging
import re
import time
import threading
import os
from pathlib import Path
from typing import Optional, Callable, Dict, List, TextIO, Literal
from dataclasses import dataclass
import torch
from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download

logger = logging.getLogger(__name__)


@dataclass
class Word:
    start: float
    end: float
    word: str
    confidence: Optional[float]

    def to_dict(self) -> Dict[str, object]:
        return {
            "start": self.start,
            "end": self.end,
            "word": self.word,
            "confidence": self.confidence
        }


@dataclass
class Segment:
    id: int
    start: float
    end: float
    text: str
    confidence: Optional[float]
    words: List[Word]

    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "text": self.text,
            "confidence": self.confidence,
            "words": [word.to_dict() for word in self.words] 
        }


@dataclass
class TranscriptionResult:
    text: str
    segments: List[Segment]
    language: Optional[str]

    def to_dict(self) -> Dict[str, object]:
        return {
            "text": self.text,
            "segments": [seg.to_dict() for seg in self.segments],  
            "language": self.language
        }

class ModelDownloadProgress:
    """Tracks model download progress"""

    def __init__(self, callback: Optional[Callable[[int, str], None]] = None):
        self.callback = callback
        self.total_size: int = 0
        self.downloaded: int = 0

    def update(self, chunk_size: int) -> None:
        self.downloaded += chunk_size
        if self.total_size > 0 and self.callback:
            progress = int((self.downloaded / self.total_size) * 100)
            self.callback(progress, f"Downloading model: {self.downloaded / (1024**3):.2f}GB / {self.total_size / (1024**3):.2f}GB")


class StderrInterceptor(io.TextIOBase):
    def __init__(self, original_stderr: TextIO, line_callback: Optional[Callable[[str], None]] = None):
        self.original_stderr = original_stderr
        self.line_callback = line_callback
        self._buffer = ""
        outer_self = self

        class BufferProxy(io.RawIOBase):
            def write(_, b: bytes) -> int:
                text = b.decode("utf-8", errors="ignore")
                outer_self._handle_text(text)
                return outer_self.original_stderr.buffer.write(b)

        self.buffer = BufferProxy()

    def _handle_text(self, data: str) -> None:
        self._buffer += data
        parts = self._buffer.split('\r')
        if len(parts) > 1:
            for part in parts[:-1]:
                if part.strip() and self.line_callback:
                    self.line_callback(part.strip())
            self._buffer = parts[-1]

        lines = self._buffer.split('\n')
        if len(lines) > 1:
            for line in lines[:-1]:
                if line.strip() and self.line_callback:
                    self.line_callback(line.strip())
            self._buffer = lines[-1]

    def write(self, data: str) -> int:
        self._handle_text(data)
        return self.original_stderr.write(data)

    def flush(self) -> None:
        if self._buffer.strip() and self.line_callback:
            self.line_callback(self._buffer.strip())
        self._buffer = ""
        self.original_stderr.flush()


class ProgressTracker:
    PROGRESS_PATTERN = re.compile(r"(\d+)%")
    ELAPSED_PATTERN = re.compile(r"\[(\d+):(\d+)<(\d+):(\d+),")

    def __init__(self, callback: Optional[Callable[[int, str], None]] = None):
        self.callback = callback
        self.last_progress: int = -1

    def parse_line(self, line: str) -> None:
        match = self.PROGRESS_PATTERN.search(line)
        if not match:
            return

        progress = int(match.group(1))
        if progress == self.last_progress:
            return

        self.last_progress = progress
        elapsed_time = self._extract_elapsed_time(line)

        if self.callback:
            self.callback(progress, elapsed_time)

    def _extract_elapsed_time(self, line: str) -> str:
        match = self.ELAPSED_PATTERN.search(line)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return f"{minutes:02d}:{seconds:02d}"
        return "00:00"


class TranscriptionService:
    def __init__(
        self,
        model_name: Literal["large-v3", "large-v2", "medium", "small", "base", "tiny"] = "medium",
        device: Literal["auto", "cuda", "cpu"] = "auto",
        compute_type: Literal["int8", "int8_float16", "int16", "float16"] = "float16",
        cache_dir: Optional[str] = None,
        download_callback: Optional[Callable[[int, str], None]] = None
    ):
        self.model_name = model_name
        self.device: Literal["cuda", "cpu"] = "cuda" if torch.cuda.is_available() else "cpu"
        self.compute_type: Literal["int8", "int8_float16"] = "int8"
        self.cache_dir = cache_dir or os.getenv("WHISPER_CACHE_DIR", "../models")
        self.download_callback = download_callback
        self._model: Optional[WhisperModel] = None
        self._model_loading: bool = False
        self._model_loaded: bool = False
        self._download_thread: Optional[threading.Thread] = None

    def _get_model_path(self) -> str:
        """Get the HuggingFace model repository path"""
        model_map: Dict[str, str] = {
            "large-v3": "Systran/faster-whisper-large-v3",
            "large-v2": "Systran/faster-whisper-large-v2",
            "medium": "Systran/faster-whisper-medium",
            "small": "Systran/faster-whisper-small",
            "base": "Systran/faster-whisper-base",
            "tiny": "Systran/faster-whisper-tiny",
        }
        return model_map.get(self.model_name, f"Systran/faster-whisper-{self.model_name}")

    def is_model_cached(self) -> bool:
        """Check if model is already downloaded"""
        model_repo = self._get_model_path()
        cache_path = Path(self.cache_dir) / model_repo.replace("/", "--")
        
        # Check if path exists first before calling iterdir()
        if not cache_path.exists():
            return False
        
        try:
            return any(cache_path.iterdir())
        except (OSError, FileNotFoundError):
            return False

    def download_model_async(self) -> None:
        """Download model in background thread"""
        if self._download_thread and self._download_thread.is_alive():
            logger.info("Model download already in progress")
            return

        if self.is_model_cached():
            logger.info("Model already cached")
            return

        def _download() -> None:
            try:
                self._download_model_sync()
            except Exception as e:
                logger.error(f"Background model download failed: {e}")

        self._download_thread = threading.Thread(target=_download, daemon=True)
        self._download_thread.start()
        logger.info("Started background model download")

    def _download_model_sync(self) -> None:
        """Download model with progress tracking"""
        if self.is_model_cached():
            logger.info(f"Model {self.model_name} already cached")
            if self.download_callback:
                self.download_callback(100, "Model cached")
            return

        logger.info(f"Downloading model {self.model_name} to {self.cache_dir}")
        model_repo = self._get_model_path()


        try:
            if self.download_callback:
                self.download_callback(0, "Starting download...")

            snapshot_download(
                repo_id=model_repo,
                cache_dir=self.cache_dir,
                local_dir=os.path.join(self.cache_dir, model_repo.replace("/", "--")),
                local_dir_use_symlinks=False,
            )

            if self.download_callback:
                self.download_callback(100, "Download complete")
            logger.info(f"Model {self.model_name} downloaded successfully")

        except Exception as e:
            logger.error(f"Failed to download model: {e}")
            if self.download_callback:
                self.download_callback(-1, f"Download failed: {str(e)}")
            raise

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            if self._model_loading:
                raise RuntimeError("Model is currently being loaded")

            self._model_loading = True

            if not self.is_model_cached():
                logger.info("Model not cached, downloading...")
                self._download_model_sync()

            logging.getLogger("httpx").setLevel(logging.INFO)
            logging.getLogger("huggingface_hub").setLevel(logging.INFO)

            logger.info(f"Loading Faster-Whisper model: {self.model_name}")

            self._model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
                download_root=self.cache_dir
            )

            logger.info("Model loaded successfully")
            self._model_loading = False
            self._model_loaded = True

        return self._model

    def wait_for_download(self, timeout: Optional[float] = None) -> bool:
        """Wait for background download to complete"""
        if self._download_thread:
            self._download_thread.join(timeout=timeout)
            return not self._download_thread.is_alive()
        return True

    def transcribe(
        self,
        video_path: str,
        output_path: str,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> TranscriptionResult:
        video_file = Path(video_path)
        if not video_file.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        logger.info(f"Starting transcription: {video_path}")
        start_transcription_time = time.time()

        if progress_callback:
            progress_callback(1, "00:00")

        progress_tracker = ProgressTracker(progress_callback)
        original_stderr = sys.stderr
        sys.stderr = StderrInterceptor(original_stderr, progress_tracker.parse_line)

        result_segments: List[Segment] = []
        full_text = ""
        total_duration = 0.0

        try:
            segments, info = self.model.transcribe(
                str(video_path),
                beam_size=1,
                word_timestamps=True,
                vad_filter=True,
                log_progress=True,
                vad_parameters={
                    "threshold": 0.5,
                    "min_speech_duration_ms": 250,
                    "min_silence_duration_ms": 2000
                },
            )

            total_duration = round(info.duration, 2) if info else 0.0
            processed_duration = 0.0
            segments_list = list(segments)

            for seg in segments_list:
                segment_data = Segment(
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

                result_segments.append(segment_data)
                full_text += seg.text + " "
                processed_duration += seg.end - seg.start

                percent_done = (processed_duration / total_duration) * 100 if total_duration > 0 else 100
                elapsed_str = f"{int(processed_duration // 60):02d}:{int(processed_duration % 60):02d}"

                if progress_callback:
                    progress_callback(int(percent_done), elapsed_str)

            result = TranscriptionResult(
                text=full_text.strip(),
                segments=result_segments,
                language=info.language if info else None
            )

        except (RuntimeError, IndexError) as e:
            error_msg = str(e).lower()
            if "no audio streams" in error_msg or "failed to load audio" in error_msg or "tuple index out of range" in error_msg:
                logger.warning(f"No audio stream found in {video_path}. Returning empty transcription.")
                result = TranscriptionResult(text='', segments=[], language='N/A')
                self._save_result(result.to_dict(), output_path)
                if progress_callback:
                    progress_callback(100, "00:00")
                return result
            raise

        finally:
            sys.stderr = original_stderr

        total_transcription_time = int(time.time() - start_transcription_time)
        if progress_callback:
            progress_callback(100, f"{total_transcription_time // 60:02d}:{total_transcription_time % 60:02d}")

        self._save_result(result.to_dict(), output_path)
        return result

    def _save_result(self, result: Dict[str, object], output_path: str) -> None:
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=4, ensure_ascii=False)
            logger.info(f"Transcription saved: {output_path}")
        except IOError as e:
            logger.error(f"Failed to write transcription file: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error writing file: {e}")
            raise


def run_transcription(
    video_path: str,
    json_file_path: str,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict[str, object]:
    service = TranscriptionService()
    result = service.transcribe(video_path, json_file_path, progress_callback)
    return result.to_dict()