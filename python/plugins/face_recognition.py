from services.logger import get_logger
import os
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

import cv2
import numpy as np

from services.analysis.face_recognizer import FaceRecognizer
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from utils.helpers import format_duration
from core.config import AnalysisConfig

logger = get_logger(__name__)


class FaceRecognitionPlugin(AnalyzerPlugin):
    """A plugin for detecting faces in video frames using DeepFace (Default mode will be VGG-Face, using yolov8n)."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.face_recognizer: Optional[FaceRecognizer] = None
        self.all_faces: List[Dict] = []
        self.unknown_faces_dir: Optional[Path] = None
        self.saved_unknown_faces: Dict[str, Dict] = {}
        self.current_video_path: str = ""
        self.current_job_id: str = ""

    def setup(self, video_path: str, job_id: str) -> None:
        self.face_recognizer = FaceRecognizer()
        self.current_video_path = video_path
        self.current_job_id = job_id
        self.face_recognizer.reset_unknown_registry()

        self.unknown_faces_dir = Path(
            os.getenv("UNKNOWN_FACES_DIR", '.unknown_faces'))
        self.unknown_faces_dir.mkdir(parents=True, exist_ok=True)

        self._cleanup_previous_run()

    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str
    ) -> FrameAnalysis:
        if not self.face_recognizer:
            logger.warning("Face recognizer not initialized")
            frame_analysis['faces'] = []
            return frame_analysis

        height, width = frame.shape[:2]
        scale_factor = float(frame_analysis.get('scale_factor', 1.0))
        frame_idx = frame_analysis.get('frame_idx', 0)
        timestamp_ms = int(frame_analysis['start_time_ms'])

        recognized_faces = self.face_recognizer.recognize_faces(frame)
        
        logger.info(f"We recognized {len(recognized_faces)} faces")

        output_faces = []
        for face in recognized_faces:
            scaled_face = self._scale_face_coordinates(face, scale_factor, width, height)
            output_faces.append(scaled_face)

            if face['name'].startswith("Unknown_"):
                saved = self._track_unknown_face(
                    frame, timestamp_ms, frame_idx, face,
                    video_path, frame_analysis["job_id"], scale_factor
                )
                if saved:
                    self.all_faces.append({
                        "timestamp": timestamp_ms / 1000,
                        "name": face['name'],
                        "frame_idx": frame_idx
                    })
                else:
                    logger.warning(
                        f"Failed to save unknown face {face['name']} "
                        f"at frame {frame_idx}, timestamp {timestamp_ms}ms"
                    )
            else: 
                self.all_faces.append({
                    "timestamp": timestamp_ms / 1000,
                    "name": face['name'],
                    "frame_idx": frame_idx
                })


        if output_faces:
            names = [f['name'] for f in output_faces]
            logger.debug(
                f"Video Path: {video_path},"
                f"Frame {frame_idx}: ,"
                f"{len(output_faces)} face(s) - {', '.join(names)}")

        frame_analysis['faces'] = output_faces
        return frame_analysis

    def _scale_face_coordinates(
        self,
        face: Dict,
        scale_factor: float,
        frame_width: int,
        frame_height: int
    ) -> Dict:
        """" Scale face recognized coordinate to the original frame because we scaled down for analyse """
        top, right, bottom, left = face['location']

        top = int(top * scale_factor)
        right = int(right * scale_factor)
        bottom = int(bottom * scale_factor)
        left = int(left * scale_factor)

        return {
            "name": face['name'],
            "location": [top, right, bottom, left],
            "confidence": face.get("confidence", 0),
            "bbox": {
                "x": left,
                "y": top,
                "width": right - left,
                "height": bottom - top
            },
            "frame_dimensions": {"width": frame_width, "height": frame_height},
            "emotion": {
                "label": face.get('emotion_label'),
                "confidence": face.get('emotion_confidence')
            }
        }

    def _track_unknown_face(
        self,
        frame: np.ndarray,
        timestamp_ms: int,
        frame_idx: int,
        face: Dict,
        video_path: str,
        job_id: str,
        scale_factor: float
    ) -> None:
        """" Track unknown face  and check by face name, if we save it before or it's the first time to save json and image file for user to label after the video is indexed """
        face_id = face['name']
        appearance_data = {
            "frame_index": frame_idx,
            "timestamp_ms": timestamp_ms,
            "timestamp_seconds": timestamp_ms / 1000,
            "formatted_timestamp": format_duration(timestamp_ms / 1000),
        }

        # In case a face is marked as unknown from FaceRecognizer service (DeepFace):
        # Case 1: the face is "Unknown_001" and we don't have in saved_unknown_faces yet
        # Step 1: Build the appearance data including the timestamps, the face coordinates, job_id (most important to use later on for user face labelling)
        # Step 2: Because we scaled down to video frame, we need to get face coordinates and face image in the original to train the DeepFace model with high quality
        # face images, we use the scale_factor that we pass when we scale down the frame, revert back to original frame and save it the image using _load_original_frame and opencv
        # save a json file that we can keep track of the face data, so later on the user can label the face once per video and we'll get all scenes where the face recognized
        # over FaceRecognizer._recognize_or_cluster, we're recognize the face or cluster the unknown using the embedding
         
        if face_id not in self.saved_unknown_faces:
            result = self._save_first_occurrence(
                frame, timestamp_ms, frame_idx, face, video_path,
                appearance_data, job_id, scale_factor
            )
        else:
            json_path = self.saved_unknown_faces[face_id]["json_path"]
            if os.path.exists(json_path):
             result = self._update_appearances(face_id, appearance_data)
            else:
                # JSON file was deleted, treat as first occurrence
                result = self._save_first_occurrence(
                    frame, timestamp_ms, frame_idx, face, video_path,
                    appearance_data, job_id, scale_factor
                )
        return result
    
    def _save_first_occurrence(
        self,
        frame: np.ndarray,
        timestamp_ms: int,
        frame_idx: int,
        face: Dict,
        video_path: str,
        appearance_data: Dict,
        job_id: str,
        scale_factor: float
    ) -> None:
        face_id = face['name']
        top, right, bottom, left = face['location']

        # Load original frame
        original_frame = self._load_original_frame(
            frame, video_path, timestamp_ms)
        if original_frame is None:
            logger.warning(
                f"Using scaled frame for {face_id} - original frame unavailable")
            original_frame = frame
            scale_factor = 1.0

        height, width = original_frame.shape[:2]

        left = max(0, int(left * scale_factor))
        top = max(0, int(top * scale_factor))
        right = min(width, int(right * scale_factor))
        bottom = min(height, int(bottom * scale_factor))

        pad = int(0.15 * (bottom - top))
        top = max(0, top - pad)
        left = max(0, left - pad)
        bottom = min(height, bottom + pad)
        right = min(width, right + pad)

        if left >= right or top >= bottom:
            logger.error(
                f"Invalid coordinates for {face_id}: "
                f"left={left}, right={right}, top={top}, bottom={bottom}"
            )
            return False

        face_image = original_frame[top:bottom, left:right]
        if face_image.size == 0:
            logger.error(
                f"Empty face image for {face_id} at frame {frame_idx}. "
                f"Coords: ({left},{top})-({right},{bottom}), Frame size: {width}x{height}"
            )
            return False

        video_name = Path(video_path).stem
        unique_suffix = hashlib.md5(
            f"{video_name}{face_id}{job_id}".encode()
        ).hexdigest()[:8]

        base_filename = f"{face_id}_{unique_suffix}"
        image_path = self.unknown_faces_dir / f"{base_filename}.jpg"
        json_path = self.unknown_faces_dir / f"{base_filename}.json"

        try:
            if not os.access(self.unknown_faces_dir, os.W_OK):
                logger.error(
                    f"No write permission for {self.unknown_faces_dir}")
                return

            cv2.imwrite(str(image_path), face_image, [
                        cv2.IMWRITE_JPEG_QUALITY, 85])

            metadata = {
                "face_id": face_id,
                "job_id": job_id,
                "image_file": image_path.name,
                "json_file": json_path.name,
                "image_hash": hashlib.md5(face_image.tobytes()).hexdigest(),
                "created_at": datetime.now().isoformat(),
                "video_path": video_path,
                "video_name": Path(video_path).name,
                "all_appearances": [appearance_data],
                "frame_idx": frame_idx,
                "total_appearances": 1
            }

            json_path.write_text(json.dumps(
                metadata, indent=2, ensure_ascii=False))

            self.saved_unknown_faces[face_id] = {
                "json_path": str(json_path),
                "image_path": str(image_path),
                "appearances": [appearance_data]
            }
            return True
        except Exception as e:
            logger.error(f"Failed to save unknown face {face_id}: {e}")
            return False

    def _update_appearances(self, face_id: str, appearance_data: Dict) -> None:
        """" Update exciting unknown face appearances """
        json_path = self.saved_unknown_faces[face_id]["json_path"]

        try:
            metadata = json.loads(Path(json_path).read_text())
            metadata.setdefault("all_appearances", []).append(appearance_data)
            metadata["total_appearances"] = len(metadata["all_appearances"])
            metadata["last_updated"] = datetime.now().isoformat()
            metadata["last_appearance"] = appearance_data

            Path(json_path).write_text(json.dumps(
                metadata, indent=2, ensure_ascii=False))
            self.saved_unknown_faces[face_id]["appearances"].append(
                appearance_data)
            return True

        except Exception as e:
            logger.error(f"Failed to update appearances for {face_id}: {e}")
            return False

    def _load_original_frame(self, frame: np.ndarray, video_path: str, timestamp_ms: int) -> Optional[np.ndarray]:
        """" Load original frame to save the unknown face image with high resolution """
        try:
            cap = cv2.VideoCapture(video_path)
            cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_ms)
            ret, original_frame = cap.read()
            cap.release()

            if not ret or original_frame is None:
                logger.warning(
                    f"Could not read original frame at {timestamp_ms}ms")
                original_frame = frame
            else:
                return original_frame
        except Exception as e:
            logger.error(f"Error reading original frame: {e}")
            original_frame = frame
            return original_frame

    def _cleanup_previous_run(self) -> None:
        """" Clean previous unknown faces using previous job_id, if the video processing job failed and re-run, delete previous jobs unknown saved faces"""
        removed = 0
        for json_file in self.unknown_faces_dir.glob("*.json"):
            try:
                metadata = json.loads(json_file.read_text())
                if (metadata.get("video_path") == self.current_video_path and
                        metadata.get("job_id") == self.current_job_id):

                    json_file.unlink()
                    image_file = json_file.with_suffix(".jpg")
                    if image_file.exists():
                        image_file.unlink()
                    removed += 1

            except Exception as e:
                logger.warning(f"Cleanup failed for {json_file}: {e}")
                json_file.unlink(missing_ok=True)

        if removed:
            logger.info(
                f"Cleaned {removed} previous unknown faces for job {self.current_job_id}")

    def get_results(self) -> PluginResult:
        """" Get all faces back"""
        return self.all_faces

    def get_summary(self) -> PluginResult:
        """" Get result summary that will be saved over the final json"""
        known_people = list(set(
            face['name'] for face in self.all_faces
            if not face['name'].startswith('Unknown_')
        ))

        known_appearances = {}
        for person in known_people:
            appearances = [f for f in self.all_faces if f['name'] == person]
            timestamps = [f['timestamp'] for f in appearances]
            known_appearances[person] = {
                'count': len(appearances),
                'first_seen': min(timestamps),
                'last_seen': max(timestamps)
            }

        unknown_count = sum(
            1 for f in self.all_faces if f['name'].startswith('Unknown_'))
        unique_unknown = len(
            set(f['name'] for f in self.all_faces if f['name'].startswith('Unknown_')))

        return {
            "known_people_identified": known_people,
            "known_appearances": known_appearances,
            "unknown_faces_detected": unknown_count,
            "unique_unknown_faces": unique_unknown,
            "unknown_faces_saved": len(self.saved_unknown_faces),
            "total_faces_detected": len(self.all_faces),
            "unknown_faces_directory": str(self.unknown_faces_dir),
            "unknown_faces_details": {
                face_id: {
                    "image_path": data["image_path"],
                    "json_path": data["json_path"],
                    "total_appearances": len(data["appearances"])
                }
                for face_id, data in self.saved_unknown_faces.items()
            }
        }
