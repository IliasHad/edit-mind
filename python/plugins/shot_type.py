from typing import List, Dict
import numpy as np
from collections import deque
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from core.config import AnalysisConfig


class ShotTypePlugin(AnalyzerPlugin):
    """Video shot type classification based on face coverage."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.close_up_threshold = 0.3
        self.medium_shot_threshold = 0.1
        self.ratio_window: deque = deque(maxlen=5)

    def setup(self, video_path: str, job_id: str) -> None:
        self.ratio_window.clear()

    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str
    ) -> FrameAnalysis:
        height, width = frame.shape[:2]
        faces = frame_analysis.get("faces", [])

        shot_type = self._classify_shot(width, height, faces)
        frame_analysis["shot_type"] = shot_type

        return frame_analysis

    def _classify_shot(self, frame_width: int, frame_height: int, faces: List[Dict]) -> str:
        if not faces:
            return "long-shot"

        frame_area = frame_width * frame_height
        total_face_area = self._calculate_total_face_area(faces)

        ratio = total_face_area / frame_area if frame_area else 0.0
        self.ratio_window.append(ratio)
        smoothed_ratio = np.mean(self.ratio_window)

        if smoothed_ratio > self.close_up_threshold:
            return "close-up"
        elif smoothed_ratio > self.medium_shot_threshold:
            return "medium-shot"
        return "long-shot"

    def _calculate_total_face_area(self, faces: List[Dict]) -> float:
        total_area = 0.0

        for face in faces:
            location = face.get("location")
            if not location or len(location) != 4:
                continue

            top, right, bottom, left = location
            width = abs(right - left)
            height = abs(bottom - top)
            total_area += width * height

        return total_area

    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None

    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None