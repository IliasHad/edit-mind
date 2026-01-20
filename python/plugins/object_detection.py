from typing import List, Dict, Optional, Union
import numpy as np
import torch
from ultralytics import YOLO

from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from services.logger import get_logger
from core.config import AnalysisConfig

logger = get_logger(__name__)


class ObjectDetectionPlugin(AnalyzerPlugin):
    """A plugin for detecting objects in video frames using YOLO."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.yolo_model: Optional[YOLO] = None
        self.use_half = False
        self.model: str = 'yolov8s.pt'
        self.model_confidence: float = 0.5
        self.model_iou: float = 0.5
        self.image_size: int = 640

        # If you're running this script over Apple computer with M Chips
        self.batch_size: int = 8 if self.config.get("device") == "mps" else 1

    def setup(self, video_path, job_id) -> None:
        """Initialize the YOLO model."""
        # Initialize YOLO model (will download to cache_dir if needed)
        self.yolo_model = YOLO(self.model)

        self.yolo_model.to(self.config.get("device"))
        self.yolo_model.fuse()

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        detections_results = self._run_object_detection([frame])

        scale_factor = float(frame_analysis.get('scale_factor', 1.0))

        frame_objects: List[Dict[str,
                                 Union[str, float, Dict[str, float]]]] = []
        if detections_results and self.yolo_model is not None:
            detections = detections_results[0]
            if detections.boxes:
                for det in detections.boxes:
                    label = self.yolo_model.names[int(det.cls[0])]
                    confidence = float(det.conf[0]) * 100

                    x1, y1, x2, y2 = det.xyxy[0].tolist()

                    x1_orig = x1 * scale_factor
                    y1_orig = y1 * scale_factor
                    x2_orig = x2 * scale_factor
                    y2_orig = y2 * scale_factor

                    x = x1_orig
                    y = y1_orig
                    width = x2_orig - x1_orig
                    height = y2_orig - y1_orig

                    if width < 20 or height < 20:
                        continue

                    frame_objects.append({
                        "label": label,
                        "confidence": confidence,
                        "bbox": {
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height
                        }
                    })

        frame_analysis['objects'] = frame_objects
        return frame_analysis

    def _run_object_detection(self, frames: List[np.ndarray]) -> List:
        """Run YOLO object detection on a batch of frames."""
        if self.yolo_model is None:
            return []

        with torch.no_grad():
            return self.yolo_model.predict(
                frames,
                device=self.config.get("device"),
                imgsz=self.image_size,
                batch=self.batch_size,
                conf=self.model_confidence,
                iou=self.model_iou,
                half=False,
                augment=False,
                verbose=False,
            )

    def get_results(self) -> PluginResult:
        return None

    def get_summary(self) -> PluginResult:
        return None

    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        return None