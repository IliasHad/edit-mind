from .base import AnalyzerPlugin, FrameAnalysis, PluginResult
from typing import Dict, Optional, Union, List
import numpy as np
import cv2
from core.config import AnalysisConfig
import easyocr

from services.logger import get_logger

logger = get_logger(__name__)


class TextDetectionPlugin(AnalyzerPlugin):
    """Analyzes frames to detect and recognize text using EasyOCR."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.reader: Optional[easyocr.Reader] = None
        self.text_scale = 0.5
        self.min_confidence: float = 0.3
        self.use_gpu = self.config.get("device") != 'cpu'

    def setup(self, video_path, job_id) -> None:
        """Initialize the EasyOCR reader."""
        try:
            self.reader = easyocr.Reader(
                ['en'],
                gpu=self.use_gpu,
                verbose=False,
                download_enabled=True
            )
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            self.reader = None

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Detect text in a single frame with optimizations."""
        if self.reader is None:
            return frame_analysis

        try:
            scale_factor = float(frame_analysis.get('scale_factor', 1.0))

            if self.text_scale != 1.0:
                small_frame = cv2.resize(
                    frame,
                    (0, 0),
                    fx=self.text_scale,
                    fy=self.text_scale,
                    interpolation=cv2.INTER_LINEAR
                )
            else:
                small_frame = frame

            frame_rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            results = self.reader.readtext(
                frame_rgb,
                detail=1,
                paragraph=False,
                min_size=10,
                text_threshold=self.min_confidence,
                low_text=self.min_confidence,
                link_threshold=0.4,
                canvas_size=2560,
                mag_ratio=1.0
            )

            if not results:
                frame_analysis['detected_text'] = []
                return frame_analysis

            detected_texts: List[Dict[str, Union[str,
                                                 float, List[List[int]], Dict[str, int]]]] = []
            scale_inverse = 1.0 / self.text_scale

            for (bbox, text, prob) in results:
                if prob < self.min_confidence:
                    continue

                scaled_bbox = [
                    [int(p[0] * scale_inverse * scale_factor),
                     int(p[1] * scale_inverse * scale_factor)]
                    for p in bbox
                ]

                x_coords = [p[0] for p in scaled_bbox]
                y_coords = [p[1] for p in scaled_bbox]

                x_min = min(x_coords)
                y_min = min(y_coords)
                x_max = max(x_coords)
                y_max = max(y_coords)

                detected_texts.append({
                    'text': text,
                    'confidence': float(prob) * 100,
                    'bounding_box': scaled_bbox,
                    'bbox': {
                        'x': x_min,
                        'y': y_min,
                        'width': x_max - x_min,
                        'height': y_max - y_min
                    }
                })

            frame_analysis['detected_text'] = detected_texts

        except Exception as e:
            logger.error(f"Error during text detection: {e}")
            frame_analysis['detected_text'] = []

        return frame_analysis

    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None
    
    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None