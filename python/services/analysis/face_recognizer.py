"""Face recognition service with clustering for unknown faces."""
from services.logger import get_logger
from deepface import DeepFace
import numpy as np
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv
import cv2
import os
from scipy.spatial.distance import cosine
from pathlib import Path

load_dotenv()
logger = get_logger(__name__)


class FaceRecognizer:
    def __init__(
        self,
        tolerance: float = 0.40,
        model: str = 'VGG-Face',
        min_face_confidence: float = 0.50,
        unknown_clustering_threshold: float = 0.60,
        detector_backend: str = "yolov8n"
    ):
        self.tolerance = tolerance
        self.model = model
        self.detector_backend = detector_backend
        self.min_face_confidence = min_face_confidence
        self.unknown_clustering_threshold = unknown_clustering_threshold
        self.unknown_face_counter = 0
        self.unknown_faces_registry: Dict[str, Dict] = {}
        self.known_faces_folder = os.getenv("FACES_DIR", '.faces')

        logger.info(
            f"FaceRecognizer initialized: model={model}, tolerance={tolerance}, "
            f"clustering_threshold={unknown_clustering_threshold}, "
            f"detector_backend={detector_backend}, "
            f"min_face_confidence={min_face_confidence}"
        )

    def reset_unknown_registry(self) -> None:
        self.unknown_faces_registry.clear()
        self.unknown_face_counter = 0

    def recognize_faces(self, frame: np.ndarray) -> List[Dict]:
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        recognized_faces = []

        try:
            face_objs = DeepFace.extract_faces(
                img_path=frame_rgb,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True,
            )

            for face_obj in face_objs:
                try:
                    face_data = self._process_face(face_obj)
                    if face_data:
                        recognized_faces.append(face_data)
                except Exception as e:
                    logger.error(f"Face processing error: {e}")

        except Exception as e:
            logger.error(f"Face detection error: {e}")

        return recognized_faces

    def _process_face(self, face_obj: Dict) -> Optional[Dict]:
        if face_obj.get("confidence", 1.0) < self.min_face_confidence:
            return None

        face_img = face_obj["face"]
        facial_area = face_obj['facial_area']

        top = facial_area['y']
        left = facial_area['x']
        bottom = facial_area['y'] + facial_area['h']
        right = facial_area['x'] + facial_area['w']

        name, confidence, is_clustered = self._recognize_or_cluster(face_img)
        emotion_data = self._analyze_emotion(face_img)

        return {
            "name": name,
            "confidence": confidence,
            "location": (top, right, bottom, left),
            "emotion_label": emotion_data.get('emotion') if emotion_data else None,
            "emotion_confidence": emotion_data.get('confidence') if emotion_data else None,
            "is_clustered": is_clustered,
            "detection_confidence": face_obj.get("confidence", 1.0) * 100
        }

    def _recognize_or_cluster(self, face_img: np.ndarray) -> Tuple[str, float, bool]:
        best_match_name = None
        best_distance = float('inf')

       # If we have a face recognized, we can just the person name from the faces folder for that person using identity from DeepFace
       # If the face is unknown, we need to check if that face has appeared before in this video (by get the current unknown face embedding and check it back with
       # our unknown_faces_registry for similarity).
       # if similar and meet the unknown_clustering_threshold , we can keep the same unknown id and pass data back to FaceRecognitionPlugin
       # to save their appearances

        if self._validate_faces_folder():
            try:
                dfs = DeepFace.find(
                    img_path=face_img,
                    db_path=self.known_faces_folder,
                    model_name=self.model,
                    enforce_detection=False,
                    detector_backend=self.detector_backend,
                    distance_metric="cosine",
                    silent=True
                )

                for df in dfs:
                    if df.empty:
                        continue

                    for _, instance in df.iterrows():
                        distance = instance["distance"]
                        if distance <= self.tolerance and distance < best_distance:
                            best_distance = distance
                            best_match_name = Path(
                                instance["identity"]).parent.name

                if best_match_name:
                    confidence = max(0, 1 - best_distance) * 100
                    return best_match_name, confidence, False

            except Exception as e:
                logger.error(f"Known face recognition error: {e}")

        return self._cluster_unknown_face(face_img)

    def _cluster_unknown_face(self, face_img: np.ndarray) -> Tuple[str, float, bool]:
        try:
            embedding = self._generate_embedding(face_img)
            if embedding is None:
                return self._create_new_unknown(), 0.0, False

            best_match_id = None
            best_similarity = 0.0

            for unknown_id, unknown_data in self.unknown_faces_registry.items():
                try:
                    distance = cosine(embedding, unknown_data['embedding'])
                    similarity = 1 - distance

                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_match_id = unknown_id
                except Exception as e:
                    logger.error(
                        f"Similarity calculation error for {unknown_id}: {e}")

            if best_match_id and (1 - best_similarity) <= self.unknown_clustering_threshold:
                registry = self.unknown_faces_registry[best_match_id]
                registry['appearances'] += 1

                alpha = 1.0 / registry['appearances']
                registry['embedding'] = (
                    (1 - alpha) * registry['embedding'] + alpha * embedding
                )

                return best_match_id, best_similarity * 100, True
            else:
                unknown_id = self._create_new_unknown()
                self._register_unknown_face(unknown_id, embedding)
                return unknown_id, 0.0, False

        except Exception as e:
            logger.error(f"Unknown face clustering error: {e}")
            return self._create_new_unknown(), 0.0, False

    def _generate_embedding(self, face_img: np.ndarray) -> Optional[np.ndarray]:
        try:
            face_img_uint8 = (
                (face_img * 255).astype(np.uint8)
                if face_img.max() <= 1.0
                else face_img.astype(np.uint8)
            )

            embedding_objs = DeepFace.represent(
                img_path=face_img_uint8,
                model_name=self.model,
                enforce_detection=False,
                detector_backend="skip",
                align=False
            )

            if embedding_objs:
                return np.array(embedding_objs[0]["embedding"])

        except Exception as e:
            logger.error(f"Embedding generation error: {e}")

        return None

    def _create_new_unknown(self) -> str:
        unknown_id = f"Unknown_{self.unknown_face_counter:03d}"
        self.unknown_face_counter += 1
        return unknown_id

    def _register_unknown_face(self, unknown_id: str, embedding: np.ndarray) -> None:
        self.unknown_faces_registry[unknown_id] = {
            'embedding': embedding,
            'appearances': 1,
        }
        logger.info(
            f"Registered {unknown_id} (total: {len(self.unknown_faces_registry)})")

    def _analyze_emotion(self, face_img: np.ndarray) -> Optional[Dict]:
        try:
            face_img_uint8 = (
                (face_img * 255).astype(np.uint8)
                if face_img.max() <= 1.0
                else face_img.astype(np.uint8)
            )

            emotion = DeepFace.analyze(
                img_path=face_img_uint8,
                actions=['emotion'],
                detector_backend="skip",
                enforce_detection=False,
                silent=True
            )

            if isinstance(emotion, list):
                emotion = emotion[0]

            emotion_probs = emotion.get("emotion", {})
            if emotion_probs:
                dominant = max(emotion_probs.items(), key=lambda x: x[1])
                return {'emotion': dominant[0], 'confidence': dominant[1]}

        except Exception as e:
            logger.warning(f"Emotion analysis error: {e}")

        return None

    def _validate_faces_folder(self) -> bool:
        if not os.path.exists(self.known_faces_folder):
            return False

        if not os.path.isdir(self.known_faces_folder):
            return False

        for item in os.listdir(self.known_faces_folder):
            item_path = os.path.join(self.known_faces_folder, item)
            if os.path.isdir(item_path):
                files = [
                    f for f in os.listdir(item_path)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png'))
                ]
                if files:
                    return True

        return False
