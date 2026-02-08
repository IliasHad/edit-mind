from abc import ABC, abstractmethod
from typing import Dict, Union, List, TypedDict, Optional
import numpy as np
from core.config import AnalysisConfig


class FrameAnalysis(TypedDict, total=False):
    """Type definition for frame analysis results."""
    start_time_ms: int
    end_time_ms: int
    duration_ms: int
    frame_idx: int
    scale_factor: float
    job_id: str

    objects: List[Dict[str, str]]
    faces: List[Dict[str, str]]
    detected_text: List[Dict[str, str]]
    dominant_color: Optional[Dict[str, str]]
    color_palette: List[Dict[str, str]]
    brightness: float
    saturation: float
    color_temperature: str
    shot_type: str
    description: str


PluginResult = Union[Dict, List, object, None]


class AnalyzerPlugin(ABC):
    """
    Base class for all video analysis plugins.

    Plugins extend the video analysis pipeline by processing frames
    and extracting specific types of information (objects, faces, etc).
    """

    def __init__(self, config: AnalysisConfig):
        """
        Initialize plugin with configuration.

        Args:
            config: Configuration dictionary containing plugin settings
        """
        self.config = config

    @classmethod
    def load_models(cls) -> None:
        """
        Load heavy, shared models (called once per process).
        """
        pass
    
    @abstractmethod
    def setup(self, video_path: str, job_id: str) -> None:
        """
        Perform one-time initialization per job.
        Called once before frame processing begins.
        """
        pass

    @abstractmethod
    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str,
    ) -> FrameAnalysis:
        """
        Analyze a single video frame.

        Args:
            frame: Video frame as NumPy array (BGR format)
            frame_analysis: Existing analysis data for this frame
            video_path: Path to the video being analyzed

        Returns:
            Updated frame_analysis dictionary with plugin results
        """
        pass

    @abstractmethod
    def get_results(self) -> PluginResult:
        """
        Return accumulated results from all processed frames.
        Called after all frames have been analyzed.
        """
        pass

    @abstractmethod
    def get_summary(self) -> PluginResult:
        """
        Return high-level summary of analysis results.
        Called after processing is complete.
        """
        pass

    @abstractmethod
    def cleanup(self) -> None:
        """
        Clean up any data from previous processing job.
        Called after processing is complete.
        """
        pass
    
    @classmethod
    def cleanup_models(cls) -> None:
        """
        Clean heavy, shared models (called once per process).
        """
        pass