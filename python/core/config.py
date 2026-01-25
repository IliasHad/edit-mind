"""Configuration management."""
from dataclasses import dataclass, field
from typing import Dict, Optional
import os


@dataclass
class AnalysisConfig:
    """Video analysis configuration."""
    sample_interval_seconds: float = 2.5
    max_workers: int = 2
    enable_streaming: bool = True
    enable_aggressive_gc: bool = False
    frame_buffer_limit: int = 2
    memory_cleanup_interval: int = 50
    target_resolution_height: int = 720
    plugin_skip_interval: Dict[str, int] = field(default_factory=lambda: {
        'DominantColorPlugin': 1,
        'TextDetectionPlugin': 1,
        'ShotTypePlugin': 1,
        "DescriptorPlugin": 1
    })

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        self._adjust_for_memory()

    def _adjust_for_memory(self) -> None:
        """Auto-adjust settings based on available memory."""
        try:
            import psutil
            available_gb = psutil.virtual_memory().available / (1024**3)

            if available_gb < 8:
                self.frame_buffer_limit = 4
                self.target_resolution_height = 480
            elif available_gb < 16:
                self.target_resolution_height = 720
        except ImportError:
            pass

    @property
    def device(self) -> str:
        """Determine optimal processing device."""
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
class TranscriptionConfig:
    """Transcription service configuration."""
    model_name: str = "medium"
    cache_dir: str = "ml-models/.whisper"
    beam_size: int = 1
    vad_filter: bool = True
    vad_threshold: float = 0.5
    min_speech_duration_ms: int = 250
    min_silence_duration_ms: int = 2000

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        self.cache_dir = os.getenv(
            'TRANSCRIPTION_MODEL_CACHE', 'ml-models/.whisper')

    @property
    def device(self) -> str:
        """Determine optimal device for transcription."""
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu"

    @property
    def compute_type(self) -> str:
        """Determine compute type based on device."""
        return "int8" if self.device == "cpu" else "int8_float16"


@dataclass
class ServerConfig:
    """WebSocket server configuration."""
    host: Optional[str] = None
    port: Optional[int] = None
    socket_path: Optional[str] = None
    max_concurrent_jobs: int = 2
    max_concurrent_analyses: int = 1
    max_concurrent_transcriptions: int = 1
    ping_interval: int = 30    
    ping_timeout: int = 60      
    close_timeout: int = 10   

    def __post_init__(self) -> None:
        """Validate and auto-calculate configuration."""
        if not self.socket_path and not (self.host and self.port):
            raise ValueError(
                "Either socket_path or (host and port) must be provided")

        # Auto-calculate if not set
        if self.max_concurrent_analyses == 2 and self.max_concurrent_transcriptions == 2:
            # Split max_concurrent_jobs between analysis and transcription
            self.max_concurrent_analyses = max(
                1, self.max_concurrent_jobs // 2)
            self.max_concurrent_transcriptions = max(
                1, self.max_concurrent_jobs - self.max_concurrent_jobs // 2)
