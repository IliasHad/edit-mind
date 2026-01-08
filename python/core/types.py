"""Core type definitions and protocols."""
from typing import Protocol, TypedDict, Callable, Awaitable, Union, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import numpy as np


# JSON Types
JsonPrimitive = Union[str, int, float, bool, None]
JsonValue = Union[JsonPrimitive, Dict[str, 'JsonValue'], List['JsonValue']]
JsonDict = Dict[str, JsonValue]


# Callback Types
class ProgressCallback(Protocol):
    """Protocol for progress callbacks."""

    def __call__(self, progress: float, elapsed: float,
                 processed: float, total: float) -> None: ...


class AsyncProgressCallback(Protocol):
    """Protocol for async progress callbacks."""

    async def __call__(self, progress: float, elapsed: float,
                       processed: float, total: float) -> None: ...


# Frame Analysis Types
class FrameData(TypedDict):
    """Frame data structure."""
    frame: np.ndarray
    timestamp_ms: int
    end_timestamp_ms: int
    frame_idx: int
    scale_factor: float
    original_size: tuple[int, int]
    job_id: str


class FrameAnalysis(TypedDict, total=False):
    """Frame analysis result structure."""
    start_time_ms: int
    end_time_ms: int
    duration_ms: int
    frame_idx: int
    scale_factor: float
    job_id: str


# Service States
class ServiceStatus(Enum):
    """Service operational states."""
    LOADING = "loading"
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


class MessageType(Enum):
    """WebSocket message types."""
    # Client requests
    ANALYZE = "analyze"
    TRANSCRIBE = "transcribe"
    HEALTH = "health"

    # Server responses
    STATUS = "status"
    ERROR = "error"
    ANALYSIS_PROGRESS = "analysis_progress"
    ANALYSIS_COMPLETED = "analysis_completed"
    ANALYSIS_ERROR = "analysis_error"
    TRANSCRIPTION_PROGRESS = "transcription_progress"
    TRANSCRIPTION_COMPLETED = "transcription_completed"
    TRANSCRIPTION_ERROR = "transcription_error"
    PING = "ping"
    PONG = "pong"


@dataclass(frozen=True)
class JobRequest:
    """Base job request structure."""
    video_path: str
    job_id: str
    json_file_path: str


@dataclass(frozen=True)
class AnalysisRequest(JobRequest):
    """Analysis job request."""
    settings: Dict[str, JsonValue]


@dataclass(frozen=True)
class TranscriptionRequest(JobRequest):
    """Transcription job request."""
    pass
