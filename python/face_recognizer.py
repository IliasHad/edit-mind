from deepface import DeepFace
import numpy as np
import json
from collections import defaultdict
from typing import List, Dict
import os
from dotenv import load_dotenv
import cv2

load_dotenv()

class FaceRecognizer:
    def __init__(self, known_faces_folder: str = '.faces', tolerance: float = 0.40, model: str = 'VGG-Face'):
        """
        Initialize the face recognizer using DeepFace.
        
        Args:
            known_faces_folder: Path to folder where we have faces labeled 
            tolerance: Distance threshold for face matching (lower = stricter)
            model: DeepFace model ('VGG-Face', 'Facenet', 'Facenet512', 'OpenFace', 'DeepFace', 'DeepID', 'ArcFace', 'Dlib', 'SFace')
        """
        self.known_faces_folder = known_faces_folder
        self.tolerance = tolerance
        self.model = model 
        self.detector_backend = 'opencv' 
        self.unknown_face_encodings: Dict[str, List[np.ndarray]] = defaultdict(list)
        self.unknown_face_counter = 0
                
    def recognize_faces(self, frame: np.ndarray, upsample: int = 1) -> List[Dict[str, str]]:
        """
        Recognize faces in a frame using DeepFace.
        
        Args:
            frame: Image array (BGR format from OpenCV)
            upsample: Not used with DeepFace but kept for compatibility
        """
        # Convert BGR to RGB if needed
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        else:
            frame_rgb = frame
        
        recognized_faces = []
        
        try:

            analysis_results = DeepFace.analyze(
                img_path=frame_rgb,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend=self.detector_backend,
            )
            if not isinstance(analysis_results, list):
                analysis_results = [analysis_results]
            
            face_objs = DeepFace.extract_faces(
                img_path=frame_rgb,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True
            )
            
            
            for i, (face_obj, analysis) in enumerate(zip(face_objs, analysis_results)):
                if face_obj['confidence'] == 0:
                    continue
                    
                facial_area = face_obj['facial_area']
                
                top = facial_area['y']
                left = facial_area['x']
                bottom = facial_area['y'] + facial_area['h']
                right = facial_area['x'] + facial_area['w']
                face_location = (top, right, bottom, left)
            
                
                emotion_probs = analysis.get('emotion', {})
                emotion_data = None
                
                if emotion_probs:
                    dominant_emotion = max(emotion_probs.items(), key=lambda x: x[1])
                    emotion_data = {
                        'emotion': dominant_emotion[0],
                        'confidence': dominant_emotion[1] / 100.0
                    }
            
                
                name = "Unknown"
                confidence = 0.0
                
                face_analysis_results = DeepFace.find(
                        img_path=frame_rgb,
                        enforce_detection=False,
                        detector_backend=self.detector_backend,
                        silent=True,
                        db_path=self.known_faces_folder,
                )
        

                if len(face_analysis_results) > 0 and len(face_analysis_results[0]) > 0:
                    best_match_path = face_analysis_results[0].iloc[0]
                    name = os.path.basename(os.path.dirname(best_match_path["identity"]))
                    confidence = best_match_path["confidence"]
                    
                face_encoding = None
                try:
                    face_img = face_obj['face']
                    embedding_objs = DeepFace.represent(
                        img_path=face_img,
                        model_name=self.model,
                        enforce_detection=False
                    )
                    
                    if not embedding_objs:
                        continue
                        
                    face_encoding = np.array(embedding_objs[0]['embedding'])
                    
                except Exception as e:
                    print(f"Error getting embedding: {e}")
                    continue
                
                if name == "Unknown":
                    found_existing_unknown = False
                    for unknown_name, encodings in self.unknown_face_encodings.items():
                        if encodings:
                            distances = [self._cosine_distance(enc, face_encoding) for enc in encodings]
                            if np.min(distances) <= self.tolerance:
                                name = unknown_name
                                found_existing_unknown = True
                                confidence = self._distance_to_confidence(np.min(distances), self.tolerance)
                                break
                    
                    if not found_existing_unknown:
                        name = f"Unknown_{self.unknown_face_counter:03d}"
                        self.unknown_face_counter += 1
                        confidence = 0.0
                    
                    self.unknown_face_encodings[name].append(face_encoding)
                
                recognized_faces.append({
                    "name": name,
                    "confidence": confidence,
                    "encoding": face_encoding.tolist(),
                    "location": face_location,
                    "emotion_label": emotion_data['emotion'] if emotion_data else None,
                    "emotion_confidence": emotion_data['confidence'] if emotion_data else None
                })
        
        except Exception as e:
            print(f"Error in face recognition: {e}")
        
        return recognized_faces

    @staticmethod
    def _cosine_distance(encoding1: np.ndarray, encoding2: np.ndarray) -> float:
        """Calculate cosine distance between two embeddings."""
        dot_product = np.dot(encoding1, encoding2)
        norm1 = np.linalg.norm(encoding1)
        norm2 = np.linalg.norm(encoding2)
        
        if norm1 == 0 or norm2 == 0:
            return 1.0
        
        cosine_similarity = dot_product / (norm1 * norm2)
        return 1 - cosine_similarity

    def _distance_to_confidence(self, face_distance: float, tolerance: float) -> float:
        """Convert face distance to confidence (0-1 scale)."""
        if face_distance > tolerance:
            return 0.0
        confidence = 1 / (1 + np.exp(15 * (face_distance - tolerance)))
        return confidence


    def merge_faces(self, names_to_merge: List[str], new_name: str) -> None:
        """Merges multiple faces under a single new name."""
        merged_encodings: List[np.ndarray] = []
        for name in names_to_merge:
            if name.startswith("Unknown_") and name in self.unknown_face_encodings:
                for encoding in self.unknown_face_encodings[name]:
                    merged_encodings.append(encoding)
                del self.unknown_face_encodings[name]
            else:
                for i, known_name in enumerate(self.known_face_names):
                    if known_name == name:
                        merged_encodings.append(self.known_face_encodings[i])
                        self.known_face_encodings[i] = None
                        self.known_face_names[i] = None
        
        self.known_face_encodings = [e for e in self.known_face_encodings if e is not None]
        self.known_face_names = [n for n in self.known_face_names if n is not None]

        for encoding in merged_encodings:
            self.add_known_face(new_name, encoding)
        
        self.save_known_faces()