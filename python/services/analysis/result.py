"""Analysis result structures."""
from dataclasses import dataclass, asdict
from typing import List, Dict, Union, Optional, Any
from pathlib import Path
import numpy as np

from core.types import FrameAnalysis


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result."""
    video_file: str
    frame_analysis: List[FrameAnalysis]
    summary: Dict[str, Any]
    performance_metrics: Optional[List[Dict]] = None
    plugin_performance: Optional[List[Dict]] = None
    error: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to JSON-serializable dictionary."""
        data = asdict(self)
        return self._convert_numpy_types(data)
    
    @staticmethod
    def _convert_numpy_types(obj: Any) -> Any:
        """Recursively convert NumPy types to Python natives."""
        if isinstance(obj, dict):
            return {k: VideoAnalysisResult._convert_numpy_types(v) 
                   for k, v in obj.items()}
        elif isinstance(obj, list):
            return [VideoAnalysisResult._convert_numpy_types(elem) 
                   for elem in obj]
        elif isinstance(obj, (np.bool_, np.int_, np.float_)):
            return obj.item()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, Path):
            return str(obj)
        return obj


class ResultBuilder:
    """Builder for analysis results."""
    
    @staticmethod
    def build_success_result(
        video_path: str,
        frame_analyses: List[FrameAnalysis],
        plugin_metrics: List[Dict],
        performance_metrics: List,
        memory_stats: Dict,
        total_time: float
    ) -> VideoAnalysisResult:
        """Build a successful analysis result."""
        return VideoAnalysisResult(
            video_file=video_path,
            frame_analysis=frame_analyses,
            summary={
                "total_frames_analyzed": len(frame_analyses),
                "total_analysis_time_seconds": round(total_time, 2),
                "peak_memory_mb": memory_stats.get('peak_mb', 0),
                "memory_cleanups": memory_stats.get('cleanup_count', 0),
            },
            performance_metrics=[asdict(m) for m in performance_metrics],
            plugin_performance=plugin_metrics
        )
    
    @staticmethod
    def build_error_result(
        video_path: str,
        error: str,
        memory_stats: Dict
    ) -> VideoAnalysisResult:
        """Build an error result."""
        return VideoAnalysisResult(
            video_file=video_path,
            frame_analysis=[],
            summary={
                "error": error,
                "peak_memory_mb": memory_stats.get('peak_mb', 0),
                "memory_cleanups": memory_stats.get('cleanup_count', 0)
            },
            error=error
        )