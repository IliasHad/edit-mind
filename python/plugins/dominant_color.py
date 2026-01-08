from typing import List, Dict, Tuple, Optional, Union
from dataclasses import dataclass, asdict
import numpy as np
import cv2
from collections import Counter
from sklearn.cluster import KMeans
import colorsys

from core.config import AnalysisConfig
from plugins.base import AnalyzerPlugin, FrameAnalysis
from plugins.config.colors import get_color_name, rgb_to_hex


@dataclass
class ColorInfo:
    """Information about a detected color"""
    name: str
    hex: str
    rgb: Tuple[int, int, int]
    percentage: float
    is_vibrant: bool
    is_muted: bool

    def to_json_dict(self) -> Dict[str, Union[str, float, bool]]:
        """Convert ColorInfo to a dictionary suitable for JSON serialization, excluding RGB."""
        d = asdict(self)
        del d['rgb']
        return d


@dataclass
class SceneColorAnalysis:
    """Scene-level color analysis"""
    dominant_color: Optional[Dict[str, Union[str, float, bool]]]
    overall_brightness: float
    overall_saturation: float
    overall_warmth: float
    color_mood: str
    color_harmony: str

    def to_dict(self) -> Dict:
        return asdict(self)


class DominantColorPlugin(AnalyzerPlugin):
    """Plugin for analyzing dominant colors, color palettes, and color moods in video frames."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.num_colors = 1
        self.sample_size = 500
        self.color_resize = 100
        self.frame_colors: List[Dict[str,
                                     Union[int, List[ColorInfo], float]]] = []

    def setup(self, video_path, job_id) -> None:
        """Initialize the plugin for a new video."""
        self.frame_colors = []

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Extract dominant colors and color properties from a frame."""
        try:
            dominant_color_objects = self._extract_dominant_colors(
                frame, self.num_colors)
            brightness = self._calculate_brightness(frame)
            saturation = self._calculate_saturation(frame)
            warmth = self._calculate_warmth(dominant_color_objects)

            frame_color_data: Dict[str, Union[int, List[ColorInfo], float]] = {
                'timestamp_ms': int(frame_analysis.get('start_time_ms', 0)),
                'dominant_colors': dominant_color_objects,
                'brightness': brightness,
                'saturation': saturation,
                'warmth': warmth,
            }
            self.frame_colors.append(frame_color_data)

            frame_analysis['dominant_color'] = dominant_color_objects[0].to_json_dict()

        except Exception as e:
            print(
                f"  Warning: Color analysis failed for frame: {e}", flush=True)
            frame_analysis['dominant_color'] = None

        return frame_analysis

    def _extract_dominant_colors(self, frame: np.ndarray, num_colors: int) -> List[ColorInfo]:
        """Extract dominant colors using K-Means clustering."""
        try:
            # Resize and convert to RGB
            small_frame = cv2.resize(
                frame, (self.color_resize, self.color_resize))
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            pixels = rgb_frame.reshape(-1, 3)

            # Sample pixels if needed
            if len(pixels) > self.sample_size:
                indices = np.random.choice(
                    len(pixels), self.sample_size, replace=False)
                pixels = pixels[indices]

            # Perform K-Means clustering
            kmeans = KMeans(
                n_clusters=num_colors,
                random_state=42,
                n_init=5,
                max_iter=100,
                tol=0.01,
            )
            kmeans.fit(pixels)

            colors = kmeans.cluster_centers_.astype(int)
            labels = kmeans.labels_
            label_counts = Counter(labels)
            total_pixels = len(labels)

            # Create ColorInfo objects
            color_info_list: List[ColorInfo] = []
            for i, color_rgb_array in enumerate(colors):
                rgb_tuple = tuple(color_rgb_array)
                percentage = (label_counts[i] / total_pixels) * 100

                color_info = ColorInfo(
                    name=get_color_name(rgb_tuple),
                    hex=rgb_to_hex(rgb_tuple),
                    rgb=rgb_tuple,
                    percentage=round(percentage, 2),
                    is_vibrant=self._is_vibrant(rgb_tuple),
                    is_muted=self._is_muted(rgb_tuple),
                )
                color_info_list.append(color_info)

            # Sort by percentage
            color_info_list.sort(key=lambda x: x.percentage, reverse=True)
            return color_info_list

        except Exception as e:
            print(f"  Warning: K-Means clustering failed: {e}", flush=True)
            return []

    def _is_vibrant(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if a color is vibrant (high saturation and brightness)."""
        max_val = max(rgb)
        min_val = min(rgb)
        if max_val == 0:
            return False
        saturation = (max_val - min_val) / max_val
        brightness = max_val / 255
        return saturation > 0.5 and brightness > 0.5

    def _is_muted(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if a color is muted (low saturation)."""
        max_val = max(rgb)
        min_val = min(rgb)
        if max_val == 0:
            return True
        saturation = (max_val - min_val) / max_val
        return saturation < 0.3

    def _calculate_brightness(self, frame: np.ndarray) -> float:
        """Calculate overall brightness of frame (0-100)."""
        small = cv2.resize(frame, (50, 50))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray) / 255 * 100
        return round(brightness, 2)

    def _calculate_saturation(self, frame: np.ndarray) -> float:
        """Calculate overall saturation of frame (0-100)."""
        small = cv2.resize(frame, (50, 50))
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        avg_saturation = np.mean(saturation) / 255 * 100
        return round(avg_saturation, 2)

    def _calculate_warmth(self, colors: List[ColorInfo]) -> float:
        """
        Calculate color temperature (warmth).

        Returns:
            Float from -100 (cool) to +100 (warm)
        """
        if not colors:
            return 0.0

        warmth_scores: List[float] = []
        for color_info in colors:
            r, g, b = color_info.rgb
            warmth = (r - b) / 255 * 100
            weighted_warmth = warmth * (color_info.percentage / 100)
            warmth_scores.append(weighted_warmth)

        return round(sum(warmth_scores), 2)

    def get_results(self) -> Optional[SceneColorAnalysis]:
        """Generate scene-level color analysis."""
        if not self.frame_colors:
            return None

        # Aggregate data from all frames
        all_color_objects: List[ColorInfo] = []
        all_brightness: List[float] = []
        all_saturation: List[float] = []
        all_warmth: List[float] = []

        for frame_data in self.frame_colors:
            colors = frame_data['dominant_colors']
            if isinstance(colors, list):
                all_color_objects.extend(colors)

            brightness = frame_data['brightness']
            if isinstance(brightness, (int, float)):
                all_brightness.append(float(brightness))

            saturation = frame_data['saturation']
            if isinstance(saturation, (int, float)):
                all_saturation.append(float(saturation))

            warmth = frame_data['warmth']
            if isinstance(warmth, (int, float)):
                all_warmth.append(float(warmth))

        # Calculate overall metrics
        overall_brightness = float(
            np.mean(all_brightness)) if all_brightness else 0.0
        overall_saturation = float(
            np.mean(all_saturation)) if all_saturation else 0.0
        overall_warmth = float(np.mean(all_warmth)) if all_warmth else 0.0

        # Find most common colors
        color_counter: Counter = Counter()
        for color_obj in all_color_objects:
            color_counter[color_obj.hex] += color_obj.percentage

        top_color_hexes = [k for k, v in color_counter.most_common(5)]

        # Build color palette
        color_palette_objects: List[ColorInfo] = []
        seen_hex: set = set()
        for color_obj in all_color_objects:
            if color_obj.hex in top_color_hexes and color_obj.hex not in seen_hex:
                color_palette_objects.append(color_obj)
                seen_hex.add(color_obj.hex)
            if len(color_palette_objects) >= 5:
                break

        json_color_palette = [c.to_json_dict() for c in color_palette_objects]

        # Determine mood and harmony
        color_mood = self._determine_color_mood(
            overall_brightness, overall_saturation, overall_warmth, json_color_palette
        )
        color_harmony = self._determine_color_harmony(color_palette_objects)

        dominant_color_json = json_color_palette[0] if json_color_palette else None

        return SceneColorAnalysis(
            dominant_color=dominant_color_json,
            overall_brightness=round(overall_brightness, 2),
            overall_saturation=round(overall_saturation, 2),
            overall_warmth=round(overall_warmth, 2),
            color_mood=color_mood,
            color_harmony=color_harmony,
        )

    def _determine_color_mood(
        self,
        brightness: float,
        saturation: float,
        warmth: float,
        palette: List[Dict[str, Union[str, float, bool]]]
    ) -> str:
        """Determine the overall color mood of the scene."""
        vibrant_count = sum(
            1 for c_dict in palette if c_dict.get('is_vibrant', False))

        if brightness > 70:
            return "vibrant_bright" if saturation > 50 else "bright"
        elif brightness < 30:
            return "dark"
        elif saturation < 20:
            return "muted"
        elif vibrant_count >= 2:
            return "vibrant"
        elif warmth > 30:
            return "warm"
        elif warmth < -30:
            return "cool"
        else:
            return "neutral"

    def _determine_color_harmony(self, palette: List[ColorInfo]) -> str:
        """Determine the color harmony type of the palette."""
        if len(palette) < 2:
            return "monochromatic"

        # Convert to HSV and get hues
        hues: List[float] = []
        for color_info in palette[:3]:
            rgb = color_info.rgb
            h, s, v = colorsys.rgb_to_hsv(
                rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
            hues.append(h * 360)

        if len(hues) < 2:
            return "monochromatic"

        # Calculate hue differences
        diffs: List[float] = []
        for i in range(len(hues) - 1):
            diff = abs(hues[i] - hues[i+1])
            if diff > 180:
                diff = 360 - diff
            diffs.append(diff)

        avg_diff = float(np.mean(diffs)) if diffs else 0.0

        # Classify harmony type
        if avg_diff < 30:
            return "monochromatic"
        elif avg_diff < 60:
            return "analogous"
        elif 150 < avg_diff < 210:
            return "complementary"
        else:
            return "mixed"

    def get_summary(self) -> Dict[str, Union[str, float]]:
        """Generate a concise summary of color analysis."""
        results = self.get_results()
        if results is None:
            return {}

        return {
            'dominant_color_name': results.dominant_color['name'] if results.dominant_color else 'Unknown',
            'dominant_color_hex': results.dominant_color['hex'] if results.dominant_color else '#000000',
            'color_mood': results.color_mood,
            'color_harmony': results.color_harmony,
            'overall_brightness': results.overall_brightness,
            'overall_saturation': results.overall_saturation,
            'color_temperature': 'warm' if results.overall_warmth > 20 else 'cool' if results.overall_warmth < -20 else 'neutral',
        }
