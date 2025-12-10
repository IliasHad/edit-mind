from typing import List, Dict, Tuple, Optional, Union
from dataclasses import dataclass, asdict
import numpy as np
import cv2
from collections import Counter
from sklearn.cluster import KMeans
import colorsys

from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult


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

    def to_dict(self) -> Dict[str, Union[Optional[Dict[str, Union[str, float, bool]]], List[Dict[str, Union[str, float, bool]]], float, str]]:
        return asdict(self)


class DominantColorPlugin(AnalyzerPlugin):
    """Plugin for analyzing dominant colors, color palettes, and color moods in video frames."""
    
    COLOR_NAMES: Dict[Tuple[int, int, int], str] = {
        (255, 0, 0): "Red",
        (220, 20, 60): "Crimson",
        (178, 34, 34): "Firebrick",
        (139, 0, 0): "Dark Red",
        (255, 99, 71): "Tomato",
        (255, 69, 0): "Red Orange",
        (255, 165, 0): "Orange",
        (255, 140, 0): "Dark Orange",
        (255, 127, 80): "Coral",
        (255, 160, 122): "Light Salmon",
        (255, 255, 0): "Yellow",
        (255, 215, 0): "Gold",
        (255, 255, 224): "Light Yellow",
        (189, 183, 107): "Dark Khaki",
        (0, 255, 0): "Lime",
        (0, 128, 0): "Green",
        (34, 139, 34): "Forest Green",
        (144, 238, 144): "Light Green",
        (60, 179, 113): "Medium Sea Green",
        (46, 139, 87): "Sea Green",
        (128, 128, 0): "Olive",
        (85, 107, 47): "Dark Olive Green",
        (0, 0, 255): "Blue",
        (0, 0, 139): "Dark Blue",
        (0, 191, 255): "Deep Sky Blue",
        (135, 206, 235): "Sky Blue",
        (70, 130, 180): "Steel Blue",
        (25, 25, 112): "Midnight Blue",
        (0, 255, 255): "Cyan",
        (0, 139, 139): "Dark Cyan",
        (64, 224, 208): "Turquoise",
        (128, 0, 128): "Purple",
        (75, 0, 130): "Indigo",
        (138, 43, 226): "Blue Violet",
        (147, 112, 219): "Medium Purple",
        (216, 191, 216): "Thistle",
        (221, 160, 221): "Plum",
        (238, 130, 238): "Violet",
        (255, 0, 255): "Magenta",
        (255, 192, 203): "Pink",
        (255, 182, 193): "Light Pink",
        (255, 105, 180): "Hot Pink",
        (219, 112, 147): "Pale Violet Red",
        (165, 42, 42): "Brown",
        (139, 69, 19): "Saddle Brown",
        (160, 82, 45): "Sienna",
        (210, 105, 30): "Chocolate",
        (244, 164, 96): "Sandy Brown",
        (222, 184, 135): "Burlywood",
        (210, 180, 140): "Tan",
        (255, 255, 255): "White",
        (220, 220, 220): "Gainsboro",
        (211, 211, 211): "Light Gray",
        (192, 192, 192): "Silver",
        (169, 169, 169): "Dark Gray",
        (128, 128, 128): "Gray",
        (105, 105, 105): "Dim Gray",
        (0, 0, 0): "Black",
        (245, 245, 220): "Beige",
        (255, 248, 220): "Cornsilk",
        (255, 250, 240): "Floral White",
        (250, 240, 230): "Linen",
        (255, 239, 213): "Papaya Whip",
        (255, 228, 196): "Bisque",
    }
    
    def __init__(self, config: Dict[str, Union[str, bool, int, float]]):
        super().__init__(config)
        self.num_colors = int(config.get('num_dominant_colors', 3))
        self.sample_size = int(config.get('color_sample_size', 500))
        self.color_resize = int(config.get('color_resize', 100))
        self.frame_colors: List[Dict[str, Union[int, List[ColorInfo], float]]] = []
        
    def setup(self) -> None:
        print(f"  ✓ Color Analysis: K-Means with {self.num_colors} colors, {self.color_resize}x{self.color_resize} resolution", flush=True)

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Extract dominant colors and color properties from a frame."""
        try:
            dominant_color_objects = self._extract_dominant_colors(frame, self.num_colors)
            
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
            
            frame_analysis['dominant_color'] = dominant_color_objects[0].to_json_dict() if dominant_color_objects else None
            frame_analysis['color_palette'] = [c.to_json_dict() for c in dominant_color_objects[:2]]
            frame_analysis['brightness'] = brightness
            frame_analysis['saturation'] = saturation
            frame_analysis['color_temperature'] = 'warm' if warmth > 20 else 'cool' if warmth < -20 else 'neutral'
            
        except Exception as e:
            print(f"  Warning: Color analysis failed for frame: {e}", flush=True)
            frame_analysis['dominant_color'] = None
            frame_analysis['color_palette'] = []
        
        return frame_analysis

    def _extract_dominant_colors(self, frame: np.ndarray, num_colors: int) -> List[ColorInfo]:
        """Extract dominant colors using K-Means clustering."""
        try:
            small_frame = cv2.resize(frame, (self.color_resize, self.color_resize))
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            pixels = rgb_frame.reshape(-1, 3)
            
            if len(pixels) > self.sample_size:
                indices = np.random.choice(len(pixels), self.sample_size, replace=False)
                pixels = pixels[indices]
            
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
            
            color_info_list: List[ColorInfo] = []
            for i, color_rgb_array in enumerate(colors):
                rgb_tuple = tuple(color_rgb_array)
                percentage = (label_counts[i] / total_pixels) * 100
                
                color_info = ColorInfo(
                    name=self._get_color_name(rgb_tuple),
                    hex=self._rgb_to_hex(rgb_tuple),
                    rgb=rgb_tuple,
                    percentage=round(percentage, 2),
                    is_vibrant=self._is_vibrant(rgb_tuple),
                    is_muted=self._is_muted(rgb_tuple),
                )
                color_info_list.append(color_info)
            
            color_info_list.sort(key=lambda x: x.percentage, reverse=True)
            return color_info_list
            
        except Exception as e:
            print(f"  Warning: K-Means clustering failed: {e}", flush=True)
            return []

    def _get_color_name(self, rgb: Tuple[int, int, int]) -> str:
        """Find the closest named color to the given RGB value."""
        min_distance = float('inf')
        closest_name = "Unknown"
        
        for known_rgb, name in self.COLOR_NAMES.items():
            distance = sum((a - b) ** 2 for a, b in zip(rgb, known_rgb))
            if distance < min_distance:
                min_distance = distance
                closest_name = name
        
        return closest_name

    def _rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB to hex color code."""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)

    def _is_vibrant(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if a color is vibrant (high saturation)."""
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
        """Calculate color temperature (warmth). Returns: -100 (cool) to +100 (warm)"""
        if not colors:
            return 0.0
        
        warmth_scores: List[float] = []
        for color_info in colors:
            r, g, b = color_info.rgb
            warmth = (r - b) / 255 * 100
            weighted_warmth = warmth * (color_info.percentage / 100)
            warmth_scores.append(weighted_warmth)
        
        return round(sum(warmth_scores), 2)

    def analyze_scene(self, all_frame_analyses: List[FrameAnalysis]) -> None:
        pass

    def get_results(self) -> Optional[SceneColorAnalysis]:
        """Generate scene-level color analysis."""
        if not self.frame_colors:
            return None
        
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
        
        overall_brightness = float(np.mean(all_brightness)) if all_brightness else 0.0
        overall_saturation = float(np.mean(all_saturation)) if all_saturation else 0.0
        overall_warmth = float(np.mean(all_warmth)) if all_warmth else 0.0
        
        color_counter: Counter = Counter()
        for color_obj in all_color_objects:
            color_counter[color_obj.hex] += color_obj.percentage
        
        top_color_hexes = [k for k, v in color_counter.most_common(5)]
        
        color_palette_objects: List[ColorInfo] = []
        seen_hex: set = set()
        for color_obj in all_color_objects:
            if color_obj.hex in top_color_hexes and color_obj.hex not in seen_hex:
                color_palette_objects.append(color_obj)
                seen_hex.add(color_obj.hex)
            if len(color_palette_objects) >= 5:
                break
        
        json_color_palette = [c.to_json_dict() for c in color_palette_objects]
        
        color_mood = self._determine_color_mood(overall_brightness, overall_saturation, overall_warmth, json_color_palette)
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

    def _determine_color_mood(self, brightness: float, saturation: float, warmth: float, palette: List[Dict[str, Union[str, float, bool]]]) -> str:
        """Determine the overall color mood."""
        vibrant_count = sum(1 for c_dict in palette if c_dict.get('is_vibrant', False))
        
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
        """Determine color harmony type."""
        if len(palette) < 2:
            return "monochromatic"
        
        hues: List[float] = []
        for color_info in palette[:3]:
            rgb = color_info.rgb
            h, s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
            hues.append(h * 360)
        
        if len(hues) < 2:
            return "monochromatic"
        
        diffs: List[float] = []
        for i in range(len(hues) - 1):
            diff = abs(hues[i] - hues[i+1])
            if diff > 180:
                diff = 360 - diff
            diffs.append(diff)
        
        avg_diff = float(np.mean(diffs)) if diffs else 0.0
        
        if avg_diff < 30:
            return "monochromatic"
        elif avg_diff < 60:
            return "analogous"
        elif 150 < avg_diff < 210:
            return "complementary"
        else:
            return "mixed"

    def get_summary(self) -> Dict[str, Union[str, float]]:
        """Generate a summary of color analysis."""
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