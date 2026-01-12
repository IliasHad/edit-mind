"""Whisper model management."""
import os
import threading
from pathlib import Path
from typing import Optional

from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download

from core.config import TranscriptionConfig
from core.errors import ModelLoadError
from services.logger import get_logger

logger = get_logger(__name__)


class WhisperModelManager:
    """Manages Whisper model loading and caching."""

    def __init__(self, config: TranscriptionConfig):
        self.config = config
        self._model: Optional[WhisperModel] = None
        self._model_lock = threading.Lock()
        self._loading_event = threading.Event()
        self._is_loading = False
        self._ensure_cache_dir()

    def _ensure_cache_dir(self) -> None:
        """Ensure cache directory exists."""
        cache_path = Path(self.config.cache_dir)
        try:
            cache_path.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Cache directory ready: {cache_path}")
        except Exception as e:
            logger.error(f"Failed to create cache directory: {e}")
            raise ModelLoadError(f"Failed to create cache directory: {e}")

    def get_model(self) -> WhisperModel:
        """Get the Whisper model, loading if necessary."""
        # Return if already loaded
        if self._model is not None:
            return self._model

        # Wait if currently loading
        if self._is_loading:
            logger.info("Model loading in progress, waiting...")
            self._loading_event.wait()
            if self._model is not None:
                return self._model

        # Load the model
        with self._model_lock:
            if self._model is not None:
                return self._model

            try:
                self._is_loading = True
                self._loading_event.clear()

                # Download if needed
                if not self._is_model_cached():
                    logger.info("Model not cached, downloading...")
                    self._download_model()

                # Load model
                logger.info(f"Loading Whisper model: {self.config.model_name}")
                self._model = WhisperModel(
                    self.config.model_name,
                    device=self.config.device,
                    compute_type=self.config.compute_type,
                    download_root=self.config.cache_dir
                )

                logger.info("Model loaded successfully")
                return self._model

            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise ModelLoadError(f"Failed to load model: {e}")
            finally:
                self._is_loading = False
                self._loading_event.set()

    def _is_model_cached(self) -> bool:
        """Check if model is already downloaded."""
        model_repo = self._get_model_repo()
        cache_path = Path(self.config.cache_dir) / \
            model_repo.replace("/", "--")

        if not cache_path.exists():
            return False

        try:
            return any(cache_path.iterdir())
        except (OSError, FileNotFoundError):
            return False

    def _download_model(self) -> None:
        """Download model from HuggingFace."""
        model_repo = self._get_model_repo()

        try:
            logger.info(
                f"Downloading model {self.config.model_name} to {self.config.cache_dir}")

            snapshot_download(
                repo_id=model_repo,
                cache_dir=self.config.cache_dir,
                local_dir=os.path.join(
                    self.config.cache_dir,
                    model_repo.replace("/", "--")
                ),
                local_dir_use_symlinks=False
            )

            logger.info("Model download complete")
        except Exception as e:
            logger.error(f"Model download failed: {e}")
            raise ModelLoadError(f"Model download failed: {e}")

    def _get_model_repo(self) -> str:
        """Get HuggingFace repository name for model."""
        model_map = {
            "large-v3": "Systran/faster-whisper-large-v3",
            "large-v2": "Systran/faster-whisper-large-v2",
            "medium": "Systran/faster-whisper-medium",
            "small": "Systran/faster-whisper-small",
            "base": "Systran/faster-whisper-base",
            "tiny": "Systran/faster-whisper-tiny",
        }
        return model_map.get(
            self.config.model_name,
            f"Systran/faster-whisper-{self.config.model_name}"
        )
