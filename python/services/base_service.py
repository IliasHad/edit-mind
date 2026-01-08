"""Base service class for analysis and transcription."""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Generic, TypeVar, Optional, Callable
from concurrent.futures import ThreadPoolExecutor
import asyncio

from core.types import JobRequest
from core.errors import VideoNotFoundError, ServiceError
from monitoring.memory import MemoryMonitor
from services.logger import get_logger

logger = get_logger(__name__)

TRequest = TypeVar('TRequest', bound=JobRequest)
TResult = TypeVar('TResult')


class BaseProcessingService(ABC, Generic[TRequest, TResult]):
    """Base class for processing services (analysis, transcription)."""

    def __init__(
        self,
        max_workers: int,
        enable_memory_monitoring: bool = True
    ):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.memory_monitor = MemoryMonitor() if enable_memory_monitoring else None
        self._active_jobs: set[str] = set()

    def is_processing(self, job_id: str) -> bool:
        """Check if job is currently being processed."""
        return job_id in self._active_jobs

    def get_active_jobs(self) -> set[str]:
        """Return active jobs."""
        return self._active_jobs

    async def process_async(
        self,
        request: TRequest,
        progress_callback: Optional[Callable] = None
    ) -> TResult:
        """Process request asynchronously."""
        # Validate request
        self._validate_request(request)

        # Check if already processing
        if self.is_processing(request.job_id):
            raise ServiceError(
                f"Job {request.job_id} is already being processed")

        # Mark as active
        self._active_jobs.add(request.job_id)

        try:
            # Get event loop
            loop = asyncio.get_running_loop()

            # Create thread-safe progress callback
            if progress_callback:
                wrapped_callback = self._create_thread_safe_callback(
                    progress_callback, loop
                )
            else:
                wrapped_callback = None

            # Execute in thread pool
            result = await loop.run_in_executor(
                self.executor,
                self._process_sync,
                request,
                wrapped_callback
            )

            return result

        finally:
            self._active_jobs.discard(request.job_id)
            if self.memory_monitor:
                self.memory_monitor.force_cleanup()

    def _validate_request(self, request: TRequest) -> None:
        """Validate processing request."""
        video_path = Path(request.video_path)
        if not video_path.exists():
            raise VideoNotFoundError(f"Video not found: {request.video_path}")

    def _create_thread_safe_callback(
        self,
        callback: Callable,
        loop: asyncio.AbstractEventLoop
    ) -> Callable:
        """Create thread-safe callback wrapper."""
        def wrapper(*args, **kwargs):
            asyncio.run_coroutine_threadsafe(
                self._async_callback_wrapper(callback, *args, **kwargs),
                loop
            )
        return wrapper

    async def _async_callback_wrapper(self, callback: Callable, *args, **kwargs):
        """Async wrapper for callback."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args, **kwargs)
            else:
                callback(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Callback error: {e}")

    @abstractmethod
    def _process_sync(
        self,
        request: TRequest,
        progress_callback: Optional[Callable]
    ) -> TResult:
        """Synchronous processing implementation."""
        pass

    def cleanup(self) -> None:
        """Cleanup resources."""
        self.executor.shutdown(wait=True)
