"""Service state management."""
from dataclasses import dataclass, field
from typing import Set
from core.types import ServiceStatus
from monitoring.metrics import ServiceMetrics
from services.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ServiceState:
    """Centralized service state with concurrent request tracking."""

    status: ServiceStatus = ServiceStatus.READY
    active_analyses: Set[str] = field(default_factory=set)
    active_transcriptions: Set[str] = field(default_factory=set)
    metrics: ServiceMetrics = field(default_factory=ServiceMetrics)

    def is_ready(self) -> bool:
        """Check if service can accept new requests."""
        return self.status == ServiceStatus.READY

    def is_processing(self, video_path: str) -> bool:
        """Check if video is currently being processed."""
        return (video_path in self.active_analyses or
                video_path in self.active_transcriptions)

    def start_analysis(self, video_path: str) -> None:
        """Mark video as being analyzed."""
        self.active_analyses.add(video_path)
        logger.info(
            f"Started analysis: {video_path} (active: {len(self.active_analyses)})")

    def finish_analysis(self, video_path: str, success: bool = True) -> None:
        """Mark analysis as complete."""
        self.active_analyses.discard(video_path)
        self.metrics.record_analysis(success)
        logger.info(
            f"Finished analysis: {video_path} (active: {len(self.active_analyses)})")

    def start_transcription(self, video_path: str) -> None:
        """Mark video as being transcribed."""
        self.active_transcriptions.add(video_path)
        logger.info(
            f"Started transcription: {video_path} (active: {len(self.active_transcriptions)})")

    def finish_transcription(self, video_path: str, success: bool = True) -> None:
        """Mark transcription as complete."""
        self.active_transcriptions.discard(video_path)
        self.metrics.record_transcription(success)
        logger.info(
            f"Finished transcription: {video_path} (active: {len(self.active_transcriptions)})")

    def get_health_status(self) -> dict:
        """Get current health status."""
        return {
            'status': self.status.value,
            'active_analyses': len(self.active_analyses),
            'active_transcriptions': len(self.active_transcriptions),
            'metrics': self.metrics.to_dict()
        }
