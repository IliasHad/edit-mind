from typing import Dict, List, Optional, Union
import numpy as np
import os
from plugins.base import AnalyzerPlugin, FrameAnalysis
from PIL import Image
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
from services.logger import get_logger
from core.config import AnalysisConfig

logger = get_logger(__name__)


class DescriptorPlugin(AnalyzerPlugin):
    """Frame Descriptor classifier using BLIP."""

    # Captions run ~7 tokens in practice, so the old 40-token ceiling only
    # cost generation overhead without ever being reached.
    MAX_NEW_TOKENS = 20

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.processor: Optional[BlipProcessor] = None
        self.model: Optional[BlipForConditionalGeneration] = None
        self.descriptions = []
        self.device = config.get("device", "cpu")
        self._caption_cache: Dict[int, str] = {}

    def load_models(self) -> None:
        """Load BLIP captioning model."""
        # Set up cache directory for Hugging Face models
        cache_dir = os.environ.get('HF_HOME', '/ml-models/huggingface')
        os.makedirs(cache_dir, exist_ok=True)
        
        logger.info(f"Loading BLIP model to cache directory: {cache_dir}")
        
        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            use_fast=True,
            cache_dir=cache_dir,
            tie_word_embeddings=False 
        )
        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            cache_dir=cache_dir,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        )
        
        # Move model to appropriate device
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"BLIP model loaded successfully on device: {self.device}")
        return None
    
    def setup(self, video_path, job_id) -> None:
        return None

    def _caption(self, frames: List[np.ndarray]) -> List[str]:
        """Caption one or more frames in a single forward pass."""
        images = [Image.fromarray(f) for f in frames]

        inputs = self.processor(images, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=self.MAX_NEW_TOKENS)

        return [
            self.processor.decode(seq, skip_special_tokens=True).lower()
            for seq in out
        ]

    def prepare_batch(self, frames: List[np.ndarray], frame_indices: List[int]) -> None:
        """Caption the whole batch at once — far cheaper than frame by frame."""
        if self.processor is None or self.model is None or not frames:
            return

        try:
            captions = self._caption(frames)
            self._caption_cache = dict(zip(frame_indices, captions))
        except Exception as e:
            # analyze_frame falls back to single-frame captioning on a miss.
            logger.warning(f"Batch captioning failed, falling back per frame: {e}")
            self._caption_cache = {}

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str, original_frame: np.ndarray) -> FrameAnalysis:
        """Caption each frame to understand its environment."""
        if self.processor is None or self.model is None:
            return frame_analysis

        caption = self._caption_cache.pop(frame_analysis.get("frame_idx"), None)
        if caption is None:
            caption = self._caption([frame])[0]

        self.descriptions.append(caption)
        frame_analysis["description"] = caption

        return frame_analysis

    def get_results(self) -> Optional[Dict[str, Union[str, float, Dict[str, int], int]]]:
        return {
            "descriptions": self.descriptions
        }

    def get_summary(self) -> Optional[Dict[str, Union[str, float, Dict[str, int]]]]:
        return None
    
    def cleanup(self) -> None:
        """Clean up any data from previous processing job."""
        self.descriptions = []
        self._caption_cache = {}
        
    def cleanup_models(self) -> None:
        try:
            if self.model is not None:
                del self.model
                self.model = None

            if self.processor is not None:
                del self.processor
                self.processor = None

            if self.device == "cuda":
                torch.cuda.empty_cache()

        except Exception as e:
            logger.error(f"Failed to cleanup BLIP model: {e}")