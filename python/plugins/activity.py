
from collections import Counter
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from plugins.base import AnalyzerPlugin
from plugins.environment import SceneContext
import numpy as np


@dataclass
class Activity:
    """Detected activity with confidence"""
    activity: str
    confidence: float
    primary_objects: List[str]


class ActivityPlugin(AnalyzerPlugin):
    """A plugin for classifying activities from detected objects and scene context."""

    OBJECT_CONFIDENCE_THRESHOLD = 0.4

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.activities: List[Activity] = []

    def setup(self):
        """No setup required for this plugin."""
        pass


    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
            """This plugin does not analyze individual frames."""
            return frame_analysis

    def analyze_activities(self, all_frame_analyses: List[Dict[str, Any]], scene_context: SceneContext) -> List[Activity]:
        """Classify activities from frame data."""
        if not all_frame_analyses:
            return []

        object_counts = Counter(
            obj['label']
            for frame in all_frame_analyses
            for obj in frame['objects']
            if obj['confidence'] > self.OBJECT_CONFIDENCE_THRESHOLD
        )

        total_frames = len(all_frame_analyses)
        activities = []

        ratios = {
            'person': object_counts.get('person', 0) / total_frames,
            'bicycle': object_counts.get('bicycle', 0) / total_frames,
            'motorcycle': object_counts.get('motorcycle', 0) / total_frames,
            'car': object_counts.get('car', 0) / total_frames
        }

        swimming_activity = self._detect_swimming(
            ratios['person'], object_counts, scene_context, total_frames
        )
        if swimming_activity:
            activities.append(swimming_activity)

        biking_activities = self._detect_biking(
            ratios['bicycle'], object_counts, scene_context, total_frames
        )
        activities.extend(biking_activities)

        motorcycle_activity = self._detect_motorcycling(ratios['motorcycle'])
        if motorcycle_activity:
            activities.append(motorcycle_activity)

        running_activity = self._detect_running(
            ratios['person'], ratios['bicycle'], ratios['motorcycle'],
            object_counts, total_frames
        )
        if running_activity:
            activities.append(running_activity)

        driving_activity = self._detect_driving(ratios['car'])
        if driving_activity:
            activities.append(driving_activity)

        self.activities = sorted(activities, key=lambda x: x.confidence, reverse=True)
        return self.activities

    def _detect_swimming(self, person_ratio: float, object_counts: Counter,
                        scene_context: SceneContext, total_frames: int) -> Optional[Activity]:
        """Detect swimming activity"""
        if person_ratio <= 0.2:
            return None

        water_objects = sum(
            object_counts.get(obj, 0)
            for obj in ['boat', 'surfboard', 'umbrella']
        )
        land_vehicles = sum(
            object_counts.get(obj, 0)
            for obj in ['bicycle', 'motorcycle', 'car', 'truck']
        )

        swimming_conf = 0.0

        if water_objects > 0 or scene_context.environment == 'water':
            swimming_conf += 0.6

        if land_vehicles == 0 and person_ratio > 0.4:
            swimming_conf += 0.4

        if swimming_conf > 0.3:
            return Activity(
                activity="swimming",
                confidence=min(swimming_conf, 1.0),
                primary_objects=["person"]
            )

        return None

    def _detect_biking(self, bicycle_ratio: float, object_counts: Counter,
                      scene_context: SceneContext, total_frames: int) -> List[Activity]:
        """Detect biking and mountain biking"""
        if bicycle_ratio <= 0.1:
            return []

        activities = []

        urban_objects = sum(
            object_counts.get(obj, 0)
            for obj in ['car', 'truck', 'bus']
        )
        urban_density = urban_objects / total_frames

        biking_conf = min(bicycle_ratio * 3, 0.8)
        if scene_context.environment == 'urban' or urban_objects > 0:
            biking_conf += 0.3

        if biking_conf > 0.3:
            activities.append(Activity(
                activity="biking",
                confidence=min(biking_conf, 1.0),
                primary_objects=["bicycle", "person"]
            ))

        if urban_density < 0.15:
            mountain_conf = bicycle_ratio * 2 + 0.4
            if mountain_conf > 0.4:
                activities.append(Activity(
                    activity="mountain_biking",
                    confidence=min(mountain_conf, 1.0),
                    primary_objects=["bicycle", "person"]
                ))

        return activities

    def _detect_motorcycling(self, motorcycle_ratio: float) -> Optional[Activity]:
        """Detect motorcycling activity"""
        if motorcycle_ratio > 0.1:
            return Activity(
                activity="motorcycling",
                confidence=min(motorcycle_ratio * 3, 0.9),
                primary_objects=["motorcycle", "person"]
            )
        return None

    def _detect_running(self, person_ratio: float, bicycle_ratio: float,
                       motorcycle_ratio: float, object_counts: Counter,
                       total_frames: int) -> Optional[Activity]:
        """Detect running activity"""
        if person_ratio > 0.5 and bicycle_ratio < 0.1 and motorcycle_ratio < 0.1:
            vehicle_density = sum(
                object_counts.get(obj, 0)
                for obj in ['car', 'bicycle', 'motorcycle']
            ) / total_frames

            if vehicle_density < 0.2:
                return Activity(
                    activity="running",
                    confidence=min(person_ratio * 0.7, 1.0),
                    primary_objects=["person"]
                )
        return None

    def _detect_driving(self, car_ratio: float) -> Optional[Activity]:
        """Detect driving activity"""
        if car_ratio > 0.3:
            return Activity(
                activity="driving",
                confidence=min(car_ratio * 2, 0.9),
                primary_objects=["car", "truck", "bus"]
            )
        return None

    def get_results(self) -> List[Activity]:
        """Returns the final analysis results from the plugin."""
        return self.activities

    def get_summary(self) -> None:
        """Returns a summary of the analysis results."""
        return None
