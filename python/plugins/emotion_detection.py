
import sys
import warnings
from typing import List, Dict, Any

from fer import FER

from plugins.base import AnalyzerPlugin


import numpy as np

class EmotionDetectionPlugin(AnalyzerPlugin):
    """
    A plugin for detecting emotions in faces.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.emotion_detector = None

    def setup(self):
        """
        Initializes the FER emotion detector.
        """
        self.emotion_detector = FER(mtcnn=True)

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Analyzes a single frame for emotions.

        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far for the current frame.
        :return: An updated dictionary with the analysis results from this plugin.
        """
        if 'faces' in frame_analysis and frame_analysis['faces']:
            self._add_emotions(frame, frame_analysis['faces'])
        return frame_analysis

    def _add_emotions(self, frame: np.ndarray, faces: List[Dict[str, Any]]) -> None:
        """
        Add emotion data to recognized faces.
        """
        if not faces:
            return

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                emotions_results = self.emotion_detector.detect_emotions(frame)
            except Exception as e:
                print(f"DEBUG: Error detecting emotions for frame: {e}", file=sys.stderr)
                emotions_results = []

        if emotions_results:
            for face in faces:
                ft, fr, fb, fl = face['location']
                face_area = (fr - fl) * (fb - ft)

                best_match_emotion = None
                max_iou = 0.0

                for emotion_res in emotions_results:
                    el, et, ew, eh = emotion_res['box']
                    er = el + ew
                    eb = et + eh
                    emotion_area = ew * eh

                    x_overlap = max(0, min(fr, er) - max(fl, el))
                    y_overlap = max(0, min(fb, eb) - max(ft, et))
                    intersection_area = x_overlap * y_overlap

                    union_area = face_area + emotion_area - intersection_area
                    iou = intersection_area / union_area if union_area > 0 else 0

                    if iou > max_iou:
                        max_iou = iou
                        best_match_emotion = emotion_res['emotions']

                if max_iou > 0.4:
                    face['emotion'] = best_match_emotion
                else:
                    face['emotion'] = None
        else:
            for face in faces:
                face['emotion'] = None

    def get_results(self) -> Any:
        """
        Returns the final analysis results from the plugin.
        """
        return None

    def get_summary(self) -> Any:
        """
        Returns a summary of the analysis results.
        """
        return None
