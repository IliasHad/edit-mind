from typing import Dict, Optional, Union
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

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        self.processor: Optional[BlipProcessor] = None
        self.model: Optional[BlipForConditionalGeneration] = None
        self.descriptions = []
        self.device = config.get("device", "cpu")

    def setup(self, video_path, job_id) -> None:
        """Load BLIP captioning model."""
        # Set up cache directory for Hugging Face models
        cache_dir = os.environ.get('HF_HOME', '/ml-models/huggingface')
        os.makedirs(cache_dir, exist_ok=True)
        
        logger.info(f"Loading BLIP model to cache directory: {cache_dir}")
        
        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            use_fast=True,
            cache_dir=cache_dir
        )
        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            cache_dir=cache_dir,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        
        # Move model to appropriate device
        self.model.to(self.device)
        self.model.eval()
        
        logger.info(f"BLIP model loaded successfully on device: {self.device}")

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Caption each frame to understand its environment."""
        if self.processor is None or self.model is None:
            return frame_analysis

        image = Image.fromarray(frame)

        inputs = self.processor(image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=40)

        caption = self.processor.decode(out[0], skip_special_tokens=True)
        caption = caption.lower()

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
        