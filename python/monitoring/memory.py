"""Memory monitoring and management."""
import gc
import time
from typing import Dict, Optional
from services.logger import get_logger

logger = get_logger(__name__)

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    logger.warning("psutil not installed. Memory tracking disabled.")


class MemoryMonitor:
    """Monitors and manages memory usage."""
    
    def __init__(self, enable_aggressive_gc: bool = False):
        self.enable_aggressive_gc = enable_aggressive_gc
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.peak_memory_mb: float = 0.0
        self.cleanup_count: int = 0
        self.last_cleanup_time: float = time.time()
    
    def get_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        if not self.process:
            return 0.0
        
        mem_mb = self.process.memory_info().rss / 1024 / 1024
        self.peak_memory_mb = max(self.peak_memory_mb, mem_mb)
        return mem_mb
    
    def get_available_memory_gb(self) -> float:
        """Get available system memory in GB."""
        if not HAS_PSUTIL:
            return 0.0
        return psutil.virtual_memory().available / (1024**3)
    
    def force_cleanup(self, aggressive: bool = False) -> None:
        """Force garbage collection and cache clearing."""
        if not self.enable_aggressive_gc:
            return
        
        now = time.time()
        if not aggressive and (now - self.last_cleanup_time) < 5.0:
            return
        
        self.last_cleanup_time = now
        collected = gc.collect()
        self.cleanup_count += 1
        
        self._clear_torch_cache()
        
        if self.cleanup_count % 10 == 0 or aggressive:
            logger.debug(
                f"Memory cleanup #{self.cleanup_count}: "
                f"{self.get_memory_mb():.0f}MB (peak: {self.peak_memory_mb:.0f}MB) "
                f"[collected {collected} objects]"
            )
    
    def _clear_torch_cache(self) -> None:
        """Clear PyTorch cache if available."""
        try:
            import torch
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            elif torch.cuda.is_available():
                torch.cuda.empty_cache()
        except (ImportError, AttributeError):
            pass
    
    def check_memory_pressure(self, threshold_gb: float = 2.0) -> bool:
        """Check if system is under memory pressure."""
        if not HAS_PSUTIL:
            return False
        
        available_gb = self.get_available_memory_gb()
        if available_gb < threshold_gb:
            logger.warning(f"Memory pressure detected: {available_gb:.1f}GB available")
            return True
        return False
    
    def get_stats(self) -> Dict[str, float]:
        """Get comprehensive memory statistics."""
        if not self.process:
            return {}
        
        mem_info = self.process.memory_info()
        vm = psutil.virtual_memory()
        
        return {
            'current_mb': mem_info.rss / 1024 / 1024,
            'peak_mb': self.peak_memory_mb,
            'available_mb': vm.available / 1024 / 1024,
            'percent_used': vm.percent,
            'cleanup_count': self.cleanup_count
        }