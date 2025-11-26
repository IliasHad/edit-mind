from typing import List, Dict, Any, Tuple, Union, Optional
from dataclasses import dataclass, asdict
import numpy as np
import cv2
from collections import Counter
from sklearn.cluster import KMeans
import colorsys

from plugins.base import AnalyzerPlugin

@dataclass
class ColorInfo:
    """Information about a detected color"""
    name: str
    hex: str
    rgb: Tuple[int, int, int]
    percentage: float
    is_vibrant: bool
    is_muted: bool

    def to_json_dict(self) -> Dict[str, Any]:
        """Convert ColorInfo to a dictionary suitable for JSON serialization, excluding RGB."""
        d = asdict(self)
        del d['rgb'] 
        return d

@dataclass
class SceneColorAnalysis:
    """Scene-level color analysis"""
    dominant_color: Dict[str, Any]
    color_palette: List[Dict[str, Any]]  # Top 5 colors (also Dicts)
    overall_brightness: float  # 0-100
    overall_saturation: float  # 0-100
    overall_warmth: float  # -100 (cool) to +100 (warm)
    color_mood: str  # "vibrant", "muted", "dark", "bright", "warm", "cool"
    color_harmony: str  # "monochromatic", "analogous", "complementary", "triadic", "mixed"

    def to_dict(self) -> Dict[str, Any]:
        """Convert SceneColorAnalysis to a dictionary suitable for JSON serialization."""
        return asdict(self) # asdict works because dominant_color and color_palette are already dicts


class DominantColorPlugin(AnalyzerPlugin):
    """
    Plugin for analyzing dominant colors, color palettes, and color moods in video frames.
    
    Features:
    - Extract dominant colors using K-Means clustering
    - Identify color names (basic and advanced)
    - Analyze color temperature (warm/cool)
    - Detect color mood and harmony
    - Calculate brightness and saturation
    """
    
    COLOR_NAMES = {
        # Reds
        (255, 0, 0): "Red",
        (220, 20, 60): "Crimson",
        (178, 34, 34): "Firebrick",
        (139, 0, 0): "Dark Red",
        (255, 99, 71): "Tomato",
        (255, 69, 0): "Red Orange",
        
        # Oranges
        (255, 165, 0): "Orange",
        (255, 140, 0): "Dark Orange",
        (255, 127, 80): "Coral",
        (255, 160, 122): "Light Salmon",
        
        # Yellows
        (255, 255, 0): "Yellow",
        (255, 215, 0): "Gold",
        (255, 255, 224): "Light Yellow",
        (189, 183, 107): "Dark Khaki",
        
        # Greens
        (0, 255, 0): "Lime",
        (0, 128, 0): "Green",
        (34, 139, 34): "Forest Green",
        (144, 238, 144): "Light Green",
        (60, 179, 113): "Medium Sea Green",
        (46, 139, 87): "Sea Green",
        (128, 128, 0): "Olive",
        (85, 107, 47): "Dark Olive Green",
        
        # Blues
        (0, 0, 255): "Blue",
        (0, 0, 139): "Dark Blue",
        (0, 191, 255): "Deep Sky Blue",
        (135, 206, 235): "Sky Blue",
        (70, 130, 180): "Steel Blue",
        (25, 25, 112): "Midnight Blue",
        (0, 255, 255): "Cyan",
        (0, 139, 139): "Dark Cyan",
        (64, 224, 208): "Turquoise",
        
        # Purples
        (128, 0, 128): "Purple",
        (75, 0, 130): "Indigo",
        (138, 43, 226): "Blue Violet",
        (147, 112, 219): "Medium Purple",
        (216, 191, 216): "Thistle",
        (221, 160, 221): "Plum",
        (238, 130, 238): "Violet",
        (255, 0, 255): "Magenta",
        
        # Pinks
        (255, 192, 203): "Pink",
        (255, 182, 193): "Light Pink",
        (255, 105, 180): "Hot Pink",
        (219, 112, 147): "Pale Violet Red",
        
        # Browns
        (165, 42, 42): "Brown",
        (139, 69, 19): "Saddle Brown",
        (160, 82, 45): "Sienna",
        (210, 105, 30): "Chocolate",
        (244, 164, 96): "Sandy Brown",
        (222, 184, 135): "Burlywood",
        (210, 180, 140): "Tan",
        
        # Grays
        (255, 255, 255): "White",
        (220, 220, 220): "Gainsboro",
        (211, 211, 211): "Light Gray",
        (192, 192, 192): "Silver",
        (169, 169, 169): "Dark Gray",
        (128, 128, 128): "Gray",
        (105, 105, 105): "Dim Gray",
        (0, 0, 0): "Black",
        
        # Beiges/Creams
        (245, 245, 220): "Beige",
        (255, 248, 220): "Cornsilk",
        (255, 250, 240): "Floral White",
        (250, 240, 230): "Linen",
        (255, 239, 213): "Papaya Whip",
        (255, 228, 196): "Bisque",
    }
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.num_colors = config.get('num_dominant_colors', 5)
        self.sample_size = config.get('color_sample_size', 1000)  
        
        self.frame_colors: List[Dict[str, Union[int, float, List['ColorInfo']]]] = []
        
    def setup(self):
        try:
            print("  ✓ Color Analysis: K-Means clustering available", flush=True)
        except ImportError:
            print("  ⚠️  Warning: scikit-learn not installed. Install with: pip install scikit-learn", flush=True)

    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Extract dominant colors and color properties from a frame.
        """
        try:
            # Extract dominant colors (returns List[ColorInfo])
            dominant_color_objects = self._extract_dominant_colors(frame, self.num_colors)
            
            # Calculate frame-level color metrics
            brightness = self._calculate_brightness(frame)
            saturation = self._calculate_saturation(frame)
            warmth = self._calculate_warmth(dominant_color_objects)
            
            # Store frame data for scene-level analysis. Store ColorInfo objects directly.
            frame_color_data = {
                'timestamp_ms': frame_analysis.get('start_time_ms', 0),
                'dominant_colors': dominant_color_objects,
                'brightness': brightness,
                'saturation': saturation,
                'warmth': warmth,
            }
            self.frame_colors.append(frame_color_data)
            
            # Add to frame analysis (convert to JSON-friendly dict for immediate output)
            frame_analysis['dominant_color'] = dominant_color_objects[0].to_json_dict() if dominant_color_objects else None
            frame_analysis['color_palette'] = [c.to_json_dict() for c in dominant_color_objects[:3]] # Top 3 colors
            frame_analysis['brightness'] = brightness
            frame_analysis['saturation'] = saturation
            frame_analysis['color_temperature'] = 'warm' if warmth > 20 else 'cool' if warmth < -20 else 'neutral'
            
        except Exception as e:
            print(f"  Warning: Color analysis failed for frame: {e}", flush=True)
            frame_analysis['dominant_color'] = None
            frame_analysis['color_palette'] = []
        
        return frame_analysis

    def _extract_dominant_colors(self, frame: np.ndarray, num_colors: int) -> List[ColorInfo]:
        """
        Extract dominant colors using K-Means clustering.
        Returns a list of ColorInfo objects.
        """
        try:
            # Resize frame for faster processing
            small_frame = cv2.resize(frame, (150, 150))
            
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            # Reshape to 2D array of pixels
            pixels = rgb_frame.reshape(-1, 3)
            
            # Sample random pixels if dataset is large
            if len(pixels) > self.sample_size:
                indices = np.random.choice(len(pixels), self.sample_size, replace=False)
                pixels = pixels[indices]
            
            # Perform K-Means clustering
            kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            # Get cluster centers (dominant colors)
            colors = kmeans.cluster_centers_.astype(int)
            
            # Count pixels in each cluster to get percentages
            labels = kmeans.labels_
            label_counts = Counter(labels)
            total_pixels = len(labels)
            
            # Build ColorInfo list
            color_info_list = []
            for i, color_rgb_array in enumerate(colors):
                rgb_tuple = tuple(color_rgb_array) # Store as tuple
                percentage = (label_counts[i] / total_pixels) * 100
                
                color_info = ColorInfo( # Create ColorInfo object
                    name=self._get_color_name(rgb_tuple),
                    hex=self._rgb_to_hex(rgb_tuple),
                    rgb=rgb_tuple, # Keep RGB here for internal use
                    percentage=round(percentage, 2),
                    is_vibrant=self._is_vibrant(rgb_tuple),
                    is_muted=self._is_muted(rgb_tuple),
                )
                color_info_list.append(color_info)
            
            # Sort by percentage (descending)
            color_info_list.sort(key=lambda x: x.percentage, reverse=True) # Sort by attribute
            
            return color_info_list
            
        except Exception as e:
            print(f"  Warning: K-Means clustering failed: {e}", flush=True)
            return []

    def _get_color_name(self, rgb: Tuple[int, int, int]) -> str:
        """
        Find the closest named color to the given RGB value.
        """
        min_distance = float('inf')
        closest_name = "Unknown"
        
        for known_rgb, name in self.COLOR_NAMES.items():
            # Calculate Euclidean distance in RGB space
            distance = np.sqrt(sum((a - b) ** 2 for a, b in zip(rgb, known_rgb)))
            
            if distance < min_distance:
                min_distance = distance
                closest_name = name
        
        return closest_name

    def _rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB to hex color code."""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)

    def _is_vibrant(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if a color is vibrant (high saturation)."""
        h, s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
        return s > 0.5 and v > 0.5

    def _is_muted(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if a color is muted (low saturation)."""
        h, s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
        return s < 0.3

    def _calculate_brightness(self, frame: np.ndarray) -> float:
        """
        Calculate overall brightness of frame (0-100).
        Uses perceived luminance formula.
        """
        # Convert to grayscale using perceived luminance
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray) / 255 * 100
        return round(brightness, 2)

    def _calculate_saturation(self, frame: np.ndarray) -> float:
        """
        Calculate overall saturation of frame (0-100).
        """
        # Convert to HSV
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Get saturation channel
        saturation = hsv[:, :, 1]
        
        # Calculate average saturation
        avg_saturation = np.mean(saturation) / 255 * 100
        return round(avg_saturation, 2)

    def _calculate_warmth(self, colors: List[ColorInfo]) -> float:
        """
        Calculate color temperature (warmth).
        Returns: -100 (cool) to +100 (warm)
        """
        if not colors:
            return 0.0
        
        warmth_scores = []
        
        for color_info in colors: # Iterate over ColorInfo objects
            r, g, b = color_info.rgb # Access rgb from ColorInfo object
            
            # Warmth heuristic: more red/yellow = warm, more blue = cool
            warmth = (r - b) / 255 * 100
            
            # Weight by percentage
            weighted_warmth = warmth * (color_info.percentage / 100)
            warmth_scores.append(weighted_warmth)
        
        total_warmth = sum(warmth_scores)
        return round(total_warmth, 2)

    def analyze_scene(self, all_frame_analyses: List[Dict[str, Any]]):
        """
        Analyze overall scene colors from all frames.
        """
        # This will be used in get_results()
        pass

    def get_results(self) -> Optional[SceneColorAnalysis]:
        """
        Generate scene-level color analysis.
        """
        if not self.frame_colors:
            return None
        
        # Aggregate all colors (ColorInfo objects) across frames
        all_color_objects: List[ColorInfo] = []
        all_brightness = []
        all_saturation = []
        all_warmth = []
        
        for frame_data in self.frame_colors:
            all_color_objects.extend(frame_data['dominant_colors']) # These are ColorInfo objects
            all_brightness.append(frame_data['brightness'])
            all_saturation.append(frame_data['saturation'])
            all_warmth.append(frame_data['warmth'])
        
        # Calculate overall metrics
        overall_brightness = np.mean(all_brightness)
        overall_saturation = np.mean(all_saturation)
        overall_warmth = np.mean(all_warmth)
        
        # Find most common colors across all frames
        color_counter = Counter()
        for color_obj in all_color_objects:
            color_key = color_obj.hex
            color_counter[color_key] += color_obj.percentage
        
        # Get top colors (these are still hex codes)
        top_color_hexes = [k for k, v in color_counter.most_common(5)]
        
        # Reconstruct color palette from the actual ColorInfo objects
        # Find the original ColorInfo objects for the top hexes
        color_palette_objects: List[ColorInfo] = []
        seen_hex = set()
        for color_obj in all_color_objects:
            if color_obj.hex in top_color_hexes and color_obj.hex not in seen_hex:
                color_palette_objects.append(color_obj)
                seen_hex.add(color_obj.hex)
            if len(color_palette_objects) >= 5: # Limit to top 5
                break
        
        # Now convert ColorInfo objects to JSON-friendly dictionaries for the final result
        json_color_palette = [c.to_json_dict() for c in color_palette_objects]
        
        # Determine color mood
        color_mood = self._determine_color_mood(overall_brightness, overall_saturation, overall_warmth, json_color_palette)
        
        # Determine color harmony (still needs RGB for hue calculations)
        # Use the original ColorInfo objects for harmony calculation
        color_harmony = self._determine_color_harmony(color_palette_objects)
        
        # Get dominant color (convert to JSON-friendly dict)
        dominant_color_json = json_color_palette[0] if json_color_palette else None
        
        return SceneColorAnalysis(
            dominant_color=dominant_color_json,
            color_palette=json_color_palette,
            overall_brightness=round(overall_brightness, 2),
            overall_saturation=round(overall_saturation, 2),
            overall_warmth=round(overall_warmth, 2),
            color_mood=color_mood,
            color_harmony=color_harmony,
        )

    def _determine_color_mood(self, brightness: float, saturation: float, warmth: float, palette: List[Dict]) -> str:
        """
        Determine the overall color mood of the scene.
        """
        # Check for vibrant colors
        # Ensure 'is_vibrant' and 'is_muted' are present in the dicts
        vibrant_count = sum(1 for c_dict in palette if c_dict.get('is_vibrant', False))
        muted_count = sum(1 for c_dict in palette if c_dict.get('is_muted', False))
        
        if brightness > 70:
            if saturation > 50:
                return "vibrant_bright"
            return "bright"
        elif brightness < 30:
            return "dark"
        elif saturation < 20:
            return "muted"
        elif vibrant_count >= 3:
            return "vibrant"
        elif warmth > 30:
            return "warm"
        elif warmth < -30:
            return "cool"
        else:
            return "neutral"

    def _determine_color_harmony(self, palette: List[ColorInfo]) -> str: 
        """
        Determine color harmony type based on the color palette.
        """
        if len(palette) < 2:
            return "monochromatic"
        
        # Convert to HSV for hue analysis
        hues = []
        for color_info in palette: # Iterate over ColorInfo objects
            rgb = color_info.rgb # Access rgb from ColorInfo object
            h, s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
            hues.append(h * 360)  # Convert to degrees
        
        # Calculate hue differences
        hue_diffs = []
        for i in range(len(hues)):
            for j in range(i + 1, len(hues)):
                diff = abs(hues[i] - hues[j])
                # Handle circular nature of hue
                if diff > 180:
                    diff = 360 - diff
                hue_diffs.append(diff)
        
        if not hue_diffs:
            return "monochromatic"
        
        avg_diff = np.mean(hue_diffs)
        
        # Classify harmony
        if avg_diff < 30:
            return "monochromatic"
        elif avg_diff < 60:
            return "analogous"
        elif 150 < avg_diff < 210:
            return "complementary"
        elif 100 < avg_diff < 140:
            return "triadic"
        else:
            return "mixed"

    def get_summary(self) -> Dict[str, Union[str, float]]:
        """
        Generate a summary of color analysis.
        """
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