"""Configuration management."""
from dataclasses import dataclass, field
from typing import Dict, Optional
import os


@dataclass
class AnalysisConfig:
    """Video analysis configuration."""
    sample_interval_seconds: float = 2.5
    # Number of videos analyzed concurrently. Previously this was 2 but
    # AnalysisService halved it (max_workers // 2), so the effective pool was
    # always 1 — and at max_workers=1 that integer division would have created
    # a zero-worker pool. The value is now used as-is and overridable via
    # MAX_CONCURRENT_ANALYSES. Keep at 1 unless the plugins are made
    # thread-safe: PluginManager holds one shared instance of every model
    # (YOLO, DeepFace/TF), and concurrent inference on a shared model is not
    # guaranteed safe by those libraries.
    max_workers: int = 1
    processing_timeout_seconds: float = 2700.0
    enable_streaming: bool = True
    enable_aggressive_gc: bool = True
    # Opt-in hardware (NVDEC) frame decoding. Off by default: the hwaccel path
    # in FrameProcessor._open_container has never actually taken effect —
    # av.open(options={"vcodec": "hevc_cuvid"}) passes options to the demuxer,
    # not the decoder, so the software decoder was used while the log claimed
    # otherwise (see the codec verification there). Decoding is also no longer
    # a bottleneck once seek-based sampling is used, at ~0.10s per sampled
    # frame. Model inference (YOLO/DeepFace/BLIP) runs on CUDA regardless of
    # this flag — it only affects frame decoding.
    use_gpu_frame_decode: bool = False
    # Batch size handed to plugins at once. Larger batches let GPU plugins
    # (BLIP captioning) amortize inference: measured 178ms/frame at batch=1,
    # 88ms at 2, 43ms at 4. Costs ~110MB RAM to hold 4 frames plus originals.
    frame_buffer_limit: int = 4
    memory_cleanup_interval: int = 50
    target_resolution_height: int = 720
    plugin_skip_interval: Dict[str, int] = field(default_factory=lambda: {
        'DominantColorPlugin': 1,
        'TextDetectionPlugin': 1,
        'ShotTypePlugin': 1,
        "DescriptorPlugin": 1
    })
    thumbnail_dir: str = field(
        default_factory=lambda: os.getenv(
            "THUMBNAILS_PATH",
            "/app/data/.thumbnails/"
        )
    )
    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        self.max_workers = int(os.getenv('MAX_CONCURRENT_ANALYSES', self.max_workers))
        self.processing_timeout_seconds = float(
            os.getenv('ANALYSIS_TIMEOUT_SECONDS', self.processing_timeout_seconds))
        self.enable_aggressive_gc = os.getenv(
            'ENABLE_AGGRESSIVE_GC', str(self.enable_aggressive_gc)).lower() in ('1', 'true', 'yes')
        self.use_gpu_frame_decode = os.getenv(
            'GPU_FRAME_DECODE', str(self.use_gpu_frame_decode)).lower() in ('1', 'true', 'yes')
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
    max_workers: int = 1
    processing_timeout_seconds: float = 2700.0
    enable_aggressive_gc: bool = True

    def __post_init__(self) -> None:
        """Post-initialization adjustments."""
        self.cache_dir = os.getenv(
            'TRANSCRIPTION_MODEL_CACHE', 'ml-models/.whisper')
        self.max_workers = int(os.getenv('MAX_CONCURRENT_TRANSCRIPTIONS', self.max_workers))
        self.processing_timeout_seconds = float(
            os.getenv('TRANSCRIPTION_TIMEOUT_SECONDS', self.processing_timeout_seconds))
        self.enable_aggressive_gc = os.getenv(
            'ENABLE_AGGRESSIVE_GC', str(self.enable_aggressive_gc)).lower() in ('1', 'true', 'yes')

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
        self.max_concurrent_analyses = int(os.getenv(
            'MAX_CONCURRENT_ANALYSES', "1"))
        self.max_concurrent_transcriptions = int(os.getenv(
                'MAX_CONCURRENT_TRANSCRIPTIONS', 1))
                