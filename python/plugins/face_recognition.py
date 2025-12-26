"""Face detection, recognition, and tracking plugin."""
import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union
from datetime import datetime

import cv2
import numpy as np
from dotenv import load_dotenv

from face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult

load_dotenv()

logger = logging.getLogger(__name__)


class FaceRecognitionPlugin(AnalyzerPlugin):
    """Plugin for detecting and recognizing faces in video frames."""

    def __init__(self, config: Dict[str, Union[str, bool, int, float]]):
        super().__init__(config)
        self.face_recognizer: Optional[FaceRecognizer] = None
        self.all_faces: List[Dict[str, Union[float, str, int]]] = []
        self.unknown_faces_output_path: Optional[Path] = None
        self.known_faces_folder = os.getenv("FACES_DIR") or '.faces'
        self.detection_model = str(config.get('detection_model', 'VGG-Face'))
        self.face_scale = float(config.get('face_scale', 0.5))
        self.save_unknown_faces = bool(config.get('save_unknown_faces', True))
        
        self.saved_unknown_faces: Dict[str, Dict[str, Union[str, List]]] = {}

    def setup(self) -> None:
        """Initialize face recognizer and load known faces."""        
        self.face_recognizer = FaceRecognizer(
            known_faces_folder=self.known_faces_folder,
            model=self.detection_model
        )
        if self.known_faces_folder:
            os.makedirs(self.known_faces_folder, exist_ok=True)
        
        if self.save_unknown_faces:
            path_str = os.getenv("UNKNOWN_FACES_DIR", str(self.config.get('unknown_faces_dir', 'unknown_faces')))
            self.unknown_faces_output_path = Path(path_str)
            self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Unknown faces directory: {self.unknown_faces_output_path}") 

    def analyze_frame(
        self, 
        frame: np.ndarray, 
        frame_analysis: FrameAnalysis, 
        video_path: str
    ) -> FrameAnalysis:
        """Detect and recognize faces in frame."""
        if self.face_recognizer is None:
            logger.error("Face recognizer not initialized")
            frame_analysis['faces'] = []
            return frame_analysis
        
        original_height, original_width = frame.shape[:2]
        
        small_frame = cv2.resize(
            frame, 
            (0, 0), 
            fx=self.face_scale, 
            fy=self.face_scale,
            interpolation=cv2.INTER_LINEAR
        )
        
        recognized_faces = self.face_recognizer.recognize_faces(small_frame)
        
        frame_scale_inverse = 1.0 / self.face_scale
        ui_scale = float(frame_analysis.get('scale_factor', 1.0))

        output_faces = []
        for face in recognized_faces:
            top, right, bottom, left = face['location']

            top = int(round(top * frame_scale_inverse))
            right = int(round(right * frame_scale_inverse))
            bottom = int(round(bottom * frame_scale_inverse))
            left = int(round(left * frame_scale_inverse))

            left = max(0, min(left, original_width - 1))
            top = max(0, min(top, original_height - 1))
            right = max(0, min(right, original_width))
            bottom = max(0, min(bottom, original_height))
            
            abs_x = left
            abs_y = top
            abs_w = right - left
            abs_h = bottom - top

            ui_x = abs_x * ui_scale
            ui_y = abs_y * ui_scale
            ui_w = abs_w * ui_scale
            ui_h = abs_h * ui_scale
            
            output_face: Dict[str, Union[str, List[int], Optional[Dict[str, float]], float, List[float], Dict[str, float], Dict[str, int]]] = {
                "name": face['name'],
                "location": [top, right, bottom, left],
                "confidence": face.get("confidence"),
                "bbox": {
                    "x": ui_x,
                    "y": ui_y,
                    "width": ui_w,
                    "height": ui_h
                },
                "frame_dimensions": {
                    "width": original_width,
                    "height": original_height
                },
                "emotion":{
                    "label": face.get('emotion_label'),
                    "confidence": face.get('emotion_confidence')
                }
            }
            output_faces.append(output_face)
            
            self.all_faces.append({
                "timestamp": frame_analysis['start_time_ms'] / 1000,
                "name": face['name'],
                "frame_idx": frame_analysis.get('frame_idx', 0)
            })

            if face['name'].startswith("Unknown_") and self.save_unknown_faces:
                face_original = face.copy()
                face_original['location'] = [top, right, bottom, left]
                
                self._track_unknown_face(
                    frame,
                    int(frame_analysis['start_time_ms']),
                    int(frame_analysis.get('frame_idx', 0)),
                    face_original,
                    video_path,
                    original_width,
                    original_height
                )
        frame_analysis['faces'] = output_faces
        return frame_analysis

    def _track_unknown_face(
        self,
        frame: np.ndarray,
        timestamp_ms: int,
        frame_idx: int,
        face: Dict[str, Union[str, List[int], np.ndarray, List[float]]],
        video_path: str,
        frame_width: int,
        frame_height: int
    ) -> None:
        """Track unknown face appearances and save only the first occurrence."""
        face_id = face['name']
        
        location = face['location']
        if not isinstance(location, list) or len(location) != 4:
            return
            
        top, right, bottom, left = location

        left = max(0, int(left))
        top = max(0, int(top))
        right = min(frame_width, int(right))
        bottom = min(frame_height, int(bottom))

        original_bbox = {
            'top': top,
            'right': right,
            'bottom': bottom,
            'left': left,
            'width': right - left,
            'height': bottom - top
        }

        padding_w = int((right - left) * 0.1)
        padding_h = int((bottom - top) * 0.1)
        
        padded_left = max(0, left - padding_w)
        padded_top = max(0, top - padding_h)
        padded_right = min(frame_width, right + padding_w)
        padded_bottom = min(frame_height, bottom + padding_h)

        padded_bbox = {
            'top': padded_top,
            'right': padded_right,
            'bottom': padded_bottom,
            'left': padded_left,
            'width': padded_right - padded_left,
            'height': padded_bottom - padded_top
        }

        appearance_data = {
            "frame_index": frame_idx,
            "timestamp_ms": timestamp_ms,
            "timestamp_seconds": timestamp_ms / 1000,
            "formatted_timestamp": self._format_timestamp(timestamp_ms),
            "bounding_box": original_bbox,
            "padded_bounding_box": padded_bbox
        }

        # Check if this unknown face has been saved before
        if face_id not in self.saved_unknown_faces:
            # First time seeing this face - save the image
            self._save_unknown_face_first_occurrence(
                frame,
                timestamp_ms,
                frame_idx,
                face,
                video_path,
                frame_width,
                frame_height,
                appearance_data
            )
        else:
            # Face already saved - just update the JSON with new appearance
            self._update_unknown_face_appearances(face_id, appearance_data)
   

    def _save_unknown_face_first_occurrence(
        self,
        frame: np.ndarray,
        timestamp_ms: int,
        frame_idx: int,
        face: Dict[str, Union[str, List[int], np.ndarray, List[float]]],
        video_path: str,
        frame_width: int,
        frame_height: int,
        appearance_data: Dict
    ) -> None:
        """Save the first occurrence of an unknown face."""
        face_id = face['name']
        location = face['location']
        top, right, bottom, left = location

        left = max(0, int(left))
        top = max(0, int(top))
        right = min(frame_width, int(right))
        bottom = min(frame_height, int(bottom))

        padding_w = int((right - left) * 0.1)
        padding_h = int((bottom - top) * 0.1)
        
        padded_left = max(0, left - padding_w)
        padded_top = max(0, top - padding_h)
        padded_right = min(frame_width, right + padding_w)
        padded_bottom = min(frame_height, bottom + padding_h)

        face_image = frame[padded_top:padded_bottom, padded_left:padded_right]

        if face_image.size == 0:
            return

        base_filename = f"{face_id}_first_{timestamp_ms}ms"
        image_filename = f"{base_filename}.jpg"
        json_filename = f"{base_filename}.json"
        
        if self.unknown_faces_output_path is None:
            return
            
        image_filepath = self.unknown_faces_output_path / image_filename
        json_filepath = self.unknown_faces_output_path / json_filename
        
        try:
            self.unknown_faces_output_path.mkdir(parents=True, exist_ok=True)
            h, w = frame.shape[:2]
            cv2.imwrite(
                str(image_filepath), 
                face_image,
                [cv2.IMWRITE_JPEG_QUALITY, 85]
            )
            original_bbox = {
            'top': top,
            'right': right,
            'bottom': bottom,
            'left': left,
            'width': right - left,
            'height': bottom - top
            }
            padding_w = int((right - left) * 0.1)
            padding_h = int((bottom - top) * 0.1)
            
            padded_left = max(0, left - padding_w)
            padded_top = max(0, top - padding_h)
            padded_right = min(w, right + padding_w)
            padded_bottom = min(h, bottom + padding_h)

            padded_bbox = {
                'top': padded_top,
                'right': padded_right,
                'bottom': padded_bottom,
                'left': padded_left,
                'width': padded_right - padded_left,
                'height': padded_bottom - padded_top
            }

            metadata = {
                "image_file": image_filename,
                "json_file": json_filename,
                "image_hash": hashlib.md5(face_image.tobytes()).hexdigest(),
                "created_at": datetime.now().isoformat(),
                "video_path": video_path,
                "video_name": Path(video_path).name if video_path else "unknown",
                "frame_index": frame_idx,
                "timestamp_ms": timestamp_ms,
                "timestamp_seconds": timestamp_ms / 1000,
                "formatted_timestamp": self._format_timestamp(timestamp_ms),
                "frame_dimensions": {"width": w, "height": h},
                "face_id": face['name'],
                "bounding_box": original_bbox,
                "padded_bounding_box": padded_bbox,
                "first_appearance": appearance_data,
                "all_appearances": [appearance_data],
                "total_appearances": 1,
                "label": {
                    "name": None,
                    "labeled_by": None,
                    "labeled_at": None,
                    "confidence": None,
                    "notes": None
                }
            }
            
            with open(json_filepath, 'w', encoding='utf-8') as json_file:
                json.dump(metadata, json_file, indent=2, ensure_ascii=False)
            
            self.saved_unknown_faces[face_id] = {
                "json_path": str(json_filepath),
                "image_path": str(image_filepath),
                "appearances": [appearance_data]
            }
            
            
        except Exception as e:
            logger.error(f"Error saving unknown face {image_filepath}: {e}")

    def _update_unknown_face_appearances(
        self,
        face_id: str,
        appearance_data: Dict
    ) -> None:
        """Update the JSON file with a new appearance of an already-saved unknown face."""
        if face_id not in self.saved_unknown_faces:
            return
        
        json_path = self.saved_unknown_faces[face_id]["json_path"]
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            metadata["all_appearances"].append(appearance_data)
            metadata["total_appearances"] = len(metadata["all_appearances"])
            metadata["last_updated"] = datetime.now().isoformat()
            metadata["last_appearance"] = appearance_data
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            self.saved_unknown_faces[face_id]["appearances"].append(appearance_data)
            
            
        except Exception as e:
            logger.error(f"Error updating unknown face {face_id}: {e}")

    @staticmethod
    def _format_timestamp(timestamp_ms: int) -> str:
        """Format timestamp in HH:MM:SS.mmm format."""
        total_seconds = timestamp_ms / 1000
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        seconds = int(total_seconds % 60)
        milliseconds = int(timestamp_ms % 1000)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

    def get_results(self) -> PluginResult:
        """Return all detected faces."""
        return self.all_faces

    def get_summary(self) -> PluginResult:
        """Return comprehensive face recognition summary."""
        known_people = list(set(
            face['name']
            for face in self.all_faces
            if isinstance(face.get('name'), str) and not face['name'].startswith('Unknown_')
        ))

        unknown_count = sum(
            1 for face in self.all_faces
            if isinstance(face.get('name'), str) and face['name'].startswith('Unknown_')
        )

        unique_unknown = len(set(
            face['name']
            for face in self.all_faces
            if isinstance(face.get('name'), str) and face['name'].startswith('Unknown_')
        ))

        known_appearances: Dict[str, Dict[str, Union[int, float]]] = {}
        for person in known_people:
            appearances = [f for f in self.all_faces if f.get('name') == person]
            if appearances:
                timestamps = [float(f['timestamp']) for f in appearances if isinstance(f.get('timestamp'), (int, float))]
                known_appearances[person] = {
                    'count': len(appearances),
                    'first_seen': min(timestamps) if timestamps else 0.0,
                    'last_seen': max(timestamps) if timestamps else 0.0
                }

        logger.info(f"Known people identified: {len(known_people)}")
        logger.info(f"Unique unknown faces: {unique_unknown}")
        

        return {
            "known_people_identified": known_people,
            "known_appearances": known_appearances,
            "unknown_faces_detected": unknown_count,
            "unique_unknown_faces": unique_unknown,
            "unknown_faces_saved": len(self.saved_unknown_faces),
            "total_faces_detected": len(self.all_faces),
            "unknown_faces_directory": str(self.unknown_faces_output_path) if self.save_unknown_faces else None,
            "unknown_faces_details": {
                face_id: {
                    "image_path": data["image_path"],
                    "json_path": data["json_path"],
                    "total_appearances": len(data["appearances"])
                }
                for face_id, data in self.saved_unknown_faces.items()
            }
        }