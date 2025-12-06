import sys
import json
import argparse
import asyncio
import logging
from pathlib import Path
from typing import Optional, Callable, Dict, Union, Set, List, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from concurrent.futures import Future
import websockets
from websockets.legacy.server import WebSocketServerProtocol  
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK, ConnectionClosedError

from transcribe import TranscriptionService
from analyze import AnalysisConfig, OutputManager, VideoAnalysisResult, VideoAnalyzer
from batch_add_faces import batch_add_faces_from_folder
from face_matcher import FaceMatchingResult
import os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)
logging.getLogger('websockets').setLevel(logging.WARNING)

# Type aliases
JsonPrimitive = Union[str, int, float, bool, None]
JsonValue = Union[JsonPrimitive, Dict[str, 'JsonValue'], List['JsonValue']]
JsonDict = Dict[str, JsonValue]
ProgressCallback = Callable[[float, float, float, float], None]
TranscriptionProgressCallback = Callable[[int, str], None]
ReindexProgressCallback = Callable[[Dict[str, Union[str, int]]], Awaitable[None]]


class ServiceStatus(Enum):
    """Service operational states."""
    LOADING = "loading"
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"


class MessageType(Enum):
    """WebSocket message types for client-server communication."""
    
    # Client requests
    ANALYZE = "analyze"
    TRANSCRIBE = "transcribe"
    REINDEX_FACES = "reindex_faces"
    HEALTH = "health"
    
    # Server responses
    STATUS = "status"
    ERROR = "error"
    ANALYSIS_PROGRESS = "analysis_progress"
    ANALYSIS_COMPLETED = "analysis_completed"
    ANALYSIS_ERROR = "analysis_error"
    TRANSCRIPTION_PROGRESS = "transcription_progress"
    TRANSCRIPTION_COMPLETED = "transcription_completed"
    TRANSCRIPTION_ERROR = "transcription_error"
    REINDEX_PROGRESS = "reindex_progress"
    REINDEX_COMPLETE = "reindex_complete"
    REINDEX_ERROR = "reindex_error"
    FIND_MATCHING_FACES = "find_matching_faces"
    FACE_MATCHING_PROGRESS = "face_matching_progress"
    FACE_MATCHING_COMPLETE = "face_matching_complete"
    FACE_MATCHING_ERROR = "face_matching_error"

@dataclass
class ServiceMetrics:
    """Tracks service performance metrics."""
    
    total_analyses: int = 0
    total_transcriptions: int = 0
    failed_analyses: int = 0
    failed_transcriptions: int = 0
    
    def record_analysis(self, success: bool) -> None:
        """Record an analysis completion."""
        self.total_analyses += 1
        if not success:
            self.failed_analyses += 1
    
    def record_transcription(self, success: bool) -> None:
        """Record a transcription completion."""
        self.total_transcriptions += 1
        if not success:
            self.failed_transcriptions += 1
    
    def to_dict(self) -> Dict[str, Union[int, float]]:
        """Convert metrics to dictionary format."""
        total_analyses = max(self.total_analyses, 1)
        total_transcriptions = max(self.total_transcriptions, 1)
        
        return {
            "total_analyses": self.total_analyses,
            "total_transcriptions": self.total_transcriptions,
            "failed_analyses": self.failed_analyses,
            "failed_transcriptions": self.failed_transcriptions,
            "success_rate_analyses": (
                (self.total_analyses - self.failed_analyses) / total_analyses * 100
                if self.total_analyses > 0 else 100.0
            ),
            "success_rate_transcriptions": (
                (self.total_transcriptions - self.failed_transcriptions) / total_transcriptions * 100
                if self.total_transcriptions > 0 else 100.0
            )
        }


@dataclass
class ServiceState:
    """Centralized service state management with concurrent request tracking."""
    
    status: ServiceStatus = ServiceStatus.READY
    active_analyses: Set[str] = field(default_factory=set)
    active_transcriptions: Set[str] = field(default_factory=set)
    metrics: ServiceMetrics = field(default_factory=ServiceMetrics)
    
    def is_ready(self) -> bool:
        """Check if service is ready to accept requests."""
        return self.status == ServiceStatus.READY
    
    def is_processing_video(self, video_path: str) -> bool:
        """Check if a specific video is currently being processed."""
        return video_path in self.active_analyses
    
    def start_analysis(self, video_path: str) -> None:
        """Mark a video as being analyzed."""
        self.active_analyses.add(video_path)
        logger.info(f"Started analysis for {video_path} (active: {len(self.active_analyses)})")
    
    def finish_analysis(self, video_path: str, success: bool = True) -> None:
        """Mark a video analysis as complete."""
        self.active_analyses.discard(video_path)
        self.metrics.record_analysis(success)
        logger.info(f"Finished analysis for {video_path} (active: {len(self.active_analyses)})")
    
    def start_transcription(self, video_path: str) -> None:
        """Mark a video as being transcribed."""
        self.active_transcriptions.add(video_path)
        logger.info(f"Started transcription for {video_path} (active: {len(self.active_transcriptions)})")
    
    def finish_transcription(self, video_path: str, success: bool = True) -> None:
        """Mark a video transcription as complete."""
        self.active_transcriptions.discard(video_path)
        self.metrics.record_transcription(success)
        logger.info(f"Finished transcription for {video_path} (active: {len(self.active_transcriptions)})")


class ConnectionManager:
    """Manages WebSocket connections and safe message sending."""
    
    def __init__(self) -> None:
        self.active_connections: Set["WebSocketServerProtocol"] = set()
        self._lock: asyncio.Lock = asyncio.Lock()
    
    async def register(self, websocket: WebSocketServerProtocol) -> None:
        """Register a new WebSocket connection."""
        async with self._lock:
            self.active_connections.add(websocket)
            logger.info(f"Client registered: {websocket.remote_address} (total: {len(self.active_connections)})")
    
    async def unregister(self, websocket: WebSocketServerProtocol) -> None:
        """Unregister a WebSocket connection."""
        async with self._lock:
            self.active_connections.discard(websocket)
            logger.info(f"Client unregistered: {websocket.remote_address} (total: {len(self.active_connections)})")
    
    def is_connected(self, websocket: WebSocketServerProtocol) -> bool:
        """Check if a WebSocket connection is still active."""
        try:
            return websocket in self.active_connections and websocket.open
        except Exception:
            return False
    
    def get_connection_count(self) -> int:
        """Get the current number of active connections."""
        return len(self.active_connections)
    
    async def send_message(
        self,
        websocket: WebSocketServerProtocol,
        msg_type: MessageType,
        payload: JsonDict
    ) -> bool:
        """
        Send a message to a WebSocket client with comprehensive error handling.
        
        Returns:
            True if message was sent successfully, False otherwise.
        """
        if not self.is_connected(websocket):
            logger.debug(f"Cannot send {msg_type.value}: connection not active")
            return False
        
        try:
            message = json.dumps({"type": msg_type.value, "payload": payload})
            await websocket.send(message)
            return True
        except ConnectionClosedOK:
            logger.debug(f"Connection closed normally while sending {msg_type.value}")
            return False
        except ConnectionClosedError as e:
            logger.debug(f"Connection closed with error while sending {msg_type.value}: {e.code}")
            return False
        except ConnectionClosed as e:
            logger.debug(f"Connection closed while sending {msg_type.value}: {e}")
            return False
        except BrokenPipeError:
            logger.debug(f"Broken pipe while sending {msg_type.value}")
            return False
        except OSError as e:
            if e.errno == 32:  # EPIPE - Broken pipe
                logger.debug(f"Broken pipe (OSError) while sending {msg_type.value}")
            else:
                logger.warning(f"OSError while sending {msg_type.value}: {e}")
            return False
        except Exception as e:
            logger.warning(f"Unexpected error sending {msg_type.value}: {e}")
            return False


class CallbackGuard:
    """Guards callbacks from sending to closed connections."""
    
    def __init__(self, websocket: "WebSocketServerProtocol", connection_manager: "ConnectionManager") -> None:
        self.websocket: "WebSocketServerProtocol" = websocket
        self.connection_manager: "ConnectionManager" = connection_manager
        self.cancelled: bool = False
    
    def cancel(self) -> None:
        """Cancel this callback guard, preventing future calls."""
        self.cancelled = True
    
    def is_active(self) -> bool:
        """Check if the callback should still be allowed to execute."""
        return not self.cancelled and self.connection_manager.is_connected(self.websocket)


class MessageHandler:
    """Handles WebSocket message routing and processing."""
    
    def __init__(
        self,
        service_state: "ServiceState",
        connection_manager: "ConnectionManager",
        max_concurrent_analyses: int,
    ) -> None:
        self.state: "ServiceState" = service_state
        self.connection_manager: "ConnectionManager" = connection_manager
        self.max_concurrent_analyses: int = max_concurrent_analyses
        self.analysis_semaphore: asyncio.Semaphore = asyncio.Semaphore(
            max_concurrent_analyses
        )
        self.transcription_service: "TranscriptionService" = TranscriptionService()
        self.reindex_lock: asyncio.Lock = asyncio.Lock()

        # Track active callback guards for cleanup
        self.active_guards: Set["CallbackGuard"] = set()

        # Message type to handler mapping
        self._handlers: Dict[
            str, Callable[["WebSocketServerProtocol", JsonDict], Awaitable[None]]
        ] = {
            MessageType.ANALYZE.value: self._handle_analyze,
            MessageType.TRANSCRIBE.value: self._handle_transcribe,
            MessageType.REINDEX_FACES.value: self._handle_reindex_faces,
            MessageType.HEALTH.value: self._handle_health,
            MessageType.FIND_MATCHING_FACES.value: self._handle_find_matching_faces,
        }
    
    def cleanup_guards(self, websocket: "WebSocketServerProtocol") -> None:
        """Cancel all callback guards for a specific websocket."""
        for guard in list(self.active_guards):
            if guard.websocket == websocket:
                guard.cancel()
                self.active_guards.discard(guard)
    
    async def process_message(
        self, websocket: "WebSocketServerProtocol", message: str
    ) -> None:
        """Process and route incoming WebSocket messages."""
        try:
            data: JsonDict = json.loads(message)  # type: ignore[assignment]
            message_type = data.get("type")
            payload = data.get("payload", {})
            
            if not isinstance(message_type, str):
                await self._send_error(websocket, "Message type must be a string")
                return
            
            if not isinstance(payload, dict):
                await self._send_error(websocket, "Payload must be an object")
                return
            
            handler = self._handlers.get(message_type)
            if handler:
                await handler(websocket, payload)  
            else:
                await self._send_error(websocket, f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self._send_error(websocket, "Invalid JSON format")
        except Exception as e:
            logger.exception("Error processing message")
            await self._send_error(websocket, f"Internal error: {str(e)}")
    
    async def _send_message(
        self,
        websocket: "WebSocketServerProtocol",
        msg_type: MessageType,
        payload: JsonDict,
        job_id: Optional[str] = None,
    ) -> bool:
        """Send a message through the connection manager."""
        if not websocket:
            logger.info("websocket connection has been closed before sending a message")
            return False

        try:
            # Add job_id to payload if provided
            if job_id is not None:
                payload = {**payload, "job_id": job_id}
            
            message = json.dumps({
                "type": msg_type.value,
                "payload": payload
            })
            await websocket.send(message)
            return True
        except Exception as e:
            logger.warning(f"Failed to send message ({msg_type}): {e}")
            return False

    
    async def _send_error(
        self, websocket: "WebSocketServerProtocol", error_msg: str
    ) -> None:
        """Send an error message to the client."""
        await self._send_message(websocket, MessageType.ERROR, {"message": error_msg})
    
    async def _handle_health(
        self, websocket: "WebSocketServerProtocol", payload: JsonDict
    ) -> None:
        """Handle health check request."""
        metrics_dict = self.state.metrics.to_dict()
        health_data: JsonDict = {
            "status": self.state.status.value,
            "active_connections": self.connection_manager.get_connection_count(),
            "active_analyses": len(self.state.active_analyses),
            "active_transcriptions": len(self.state.active_transcriptions),
            "max_concurrent_analyses": self.max_concurrent_analyses,
            "metrics": metrics_dict
        }
        await self._send_message(websocket, MessageType.STATUS, health_data)
    
    async def _handle_analyze(
        self, websocket: "WebSocketServerProtocol", payload: JsonDict
    ) -> None:
        """Handle video analysis request with concurrency control."""
        video_path_str = payload.get("video_path")
        if not isinstance(video_path_str, str):
            logger.error("Missing or invalid 'video_path' in payload")
            await self._send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": "Missing or invalid 'video_path' in payload"}
            )
            return
        
        job_id = payload.get("job_id") 
        if not isinstance(job_id, str):
            logger.error("Missing or invalid 'job_id' in payload")
            await self._send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": "Missing or invalid 'job_id' in payload"}
            )
            return
            
        video_path = Path(video_path_str)
        if not video_path.exists():
            logger.error(f"Video file not found: {video_path}")
            await self._send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": f"Video file not found: {video_path}"},
                job_id=job_id
            )
            return
        
        video_path_normalized = str(video_path.resolve())
        
        if self.state.is_processing_video(video_path_normalized):
            logger.warning(f"Video already being analyzed: {video_path.name}")
            await self._send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": f"Video is already being analyzed: {video_path.name}"},
                job_id=job_id
            )
            return
        
        settings = payload.get("settings", {})
        settings_dict = settings if isinstance(settings, dict) else {}
        config = self._build_analysis_config(settings_dict)
        
        logger.info(f"Starting analysis for: {video_path.name} with {len(settings_dict)} custom settings")
        
        async with self.analysis_semaphore:
                await self._run_analysis_workflow(websocket, video_path, video_path_normalized, config, job_id)
                
    async def _run_analysis_workflow(
        self,
        websocket: "WebSocketServerProtocol",
        video_path: Path,
        video_path_normalized: str,
        config: "AnalysisConfig",
        job_id: str,
    ) -> None:
        """Execute the complete analysis workflow with proper cleanup."""
        self.state.start_analysis(video_path_normalized)
        analyzer: Optional[VideoAnalyzer] = None
        guard: Optional[CallbackGuard] = None
        success = False
        
        try:
            guard = CallbackGuard(websocket, self.connection_manager)
            self.active_guards.add(guard)
            
            analyzer = VideoAnalyzer(video_path_normalized, config)
            result = await self._execute_analysis(websocket, analyzer, guard, job_id)
            
            if result.error:
                await self._send_message(
                    websocket,
                    MessageType.ANALYSIS_ERROR,
                    {"message": f"Analysis failed: {result.error}"},
                    job_id=job_id
                )
            else:
                output_path = OutputManager.get_output_path(video_path_normalized, config.output_dir)
                OutputManager.save_result(result, output_path)
                logger.info(f"Analysis complete. Results saved to: {output_path}")
                
                result_dict = result.to_dict()
                if isinstance(result_dict, dict):
                    await self._send_message(websocket, MessageType.ANALYSIS_COMPLETED, result_dict, job_id=job_id)  
                    success = True
        
        except (BrokenPipeError, OSError) as e:
            error_msg = "connection error" if isinstance(e, BrokenPipeError) or e.errno == 32 else str(e)
            logger.warning(f"Connection issue during analysis: {error_msg}")
        except Exception as e:
            logger.exception(f"Unhandled exception during analysis: {e}")
            await self._send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": f"Internal error: {str(e)}"},
                job_id=job_id
            )
        finally:
            if guard:
                guard.cancel()
                self.active_guards.discard(guard)
            self.state.finish_analysis(video_path_normalized, success)
            if analyzer:
                analyzer.progress_callback = None
                del analyzer
    async def _execute_analysis(
        self,
        websocket: "WebSocketServerProtocol",
        analyzer: "VideoAnalyzer",
        guard: "CallbackGuard",
        job_id: str,
    ) -> "VideoAnalysisResult":
        """Execute video analysis with progress updates."""
        loop = asyncio.get_running_loop()
        
        def progress_callback(
            progress: float,
            elapsed: float,
            frames_analyzed: float,
            total_frames: float
        ) -> None:
            """Thread-safe progress callback for analyzer with robust error handling."""
            progress_data: JsonDict = {
                "progress": progress,
                "frames_analyzed": frames_analyzed,
                "elapsed": elapsed,
                "total_frames": total_frames
            }
            asyncio.run_coroutine_threadsafe(
                self._send_message(websocket, MessageType.ANALYSIS_PROGRESS, progress_data, job_id=job_id),
                loop
            )
            logger.debug(f"Sent Analysis progress: {progress_data}")
         
        
        
        try:
            analyzer.progress_callback = progress_callback

            result = await loop.run_in_executor(None, analyzer.analyze)
            result_dict = result.to_dict()
            try:
                await self._send_message(websocket, MessageType.ANALYSIS_COMPLETED, result_dict, job_id=job_id)
            except Exception as e:
                logger.warning(f"Failed to send frame analysis complete event: {e}")

            return result
        finally:
            analyzer.progress_callback = None

    
    def _build_analysis_config(
        self, settings: Dict[str, JsonValue]
    ) -> "AnalysisConfig":
        """Build analysis configuration from settings dictionary."""
        config = AnalysisConfig()
        
        for key, value in settings.items():
            if hasattr(config, key):
                setattr(config, key, value)
            else:
                logger.warning(f"Unknown configuration key ignored: {key}")
        
        return config
            
    async def _handle_transcribe(
        self, websocket: "WebSocketServerProtocol", payload: JsonDict
    ) -> None:
        """Handle transcription request with live progress updates and debug logging."""
        video_path = payload.get("video_path")
        json_file_path = payload.get("json_file_path")

        if not isinstance(video_path, str) or not isinstance(json_file_path, str):
            await self._send_message(
                websocket,
                MessageType.TRANSCRIPTION_ERROR,
                {"message": "Missing or invalid 'video_path' or 'json_file_path' in payload"}
            )
            logger.error(f"Invalid transcription request payload: {payload}")
            return
        
        job_id = payload.get("job_id") 
        if not isinstance(job_id, str):
            logger.error("Missing or invalid 'job_id' in payload")
            job_id = None  # Continue but log the issue
            
        video_path_normalized = str(Path(video_path).resolve())
        self.state.start_transcription(video_path_normalized)
        logger.info(f"Started transcription for: {video_path_normalized}")

        loop = asyncio.get_running_loop()

        def progress_callback(progress: int, elapsed: str) -> None:
            """Thread-safe callback for sending transcription progress."""
            progress_data: JsonDict = {
                "progress": progress,
                "elapsed": elapsed,
                "video_path": video_path_normalized
            }
            asyncio.run_coroutine_threadsafe(
                self._send_message(websocket, MessageType.TRANSCRIPTION_PROGRESS, progress_data, job_id=job_id),
                loop
            )
        try:
            logger.info(f"Running transcription for {video_path_normalized}")
            result = await loop.run_in_executor(
                None,
                lambda: self.transcription_service.transcribe(
                    video_path,
                    json_file_path,
                    progress_callback
                )
            )

            complete_data: JsonDict = {
                "json_file_path": json_file_path,
                "language": getattr(result, "language", "unknown"),
                "video_path": video_path_normalized
            }
            try:
                await self._send_message(websocket, MessageType.TRANSCRIPTION_COMPLETED, complete_data, job_id=job_id)
                logger.info(f"Transcription complete for {video_path_normalized} -> {json_file_path}")
            except Exception as e:
                logger.warning(f"Failed to send transcription complete event: {e}")

        except Exception as e:
            logger.exception(f"Transcription failed for {video_path_normalized}")
            await self._send_message(
                websocket,
                MessageType.TRANSCRIPTION_ERROR,
                {"message": f"Transcription failed: {str(e)}", "video_path": video_path_normalized},
                job_id=job_id
            )
        finally:
            self.state.finish_transcription(video_path_normalized)
            
    async def _handle_find_matching_faces(
        self, websocket: "WebSocketServerProtocol", payload: JsonDict
    ) -> None:
        """Handle face matching request."""
        person_name = payload.get("person_name")
        reference_images = payload.get("reference_images")
        unknown_faces_dir = payload.get("unknown_faces_dir", "analysis_results/unknown_faces")
        tolerance = payload.get("tolerance", 0.6)
        
        if not isinstance(person_name, str) or not person_name:
            await self._send_message(
                websocket,
                MessageType.FACE_MATCHING_ERROR,
                {"message": "Missing or invalid 'person_name'"}
            )
            return
        
        if not isinstance(reference_images, list) or not reference_images:
            await self._send_message(
                websocket,
                MessageType.FACE_MATCHING_ERROR,
                {"message": "Missing or invalid 'reference_images'"}
            )
            return
        
        job_id = payload.get("job_id")
        if not isinstance(job_id, str):
            logger.error("Missing or invalid 'job_id' in payload")
            job_id = None
        
        logger.info(f"Starting face matching for {person_name} with {len(reference_images)} references")
        
        guard = CallbackGuard(websocket, self.connection_manager)
        self.active_guards.add(guard)
        
        loop = asyncio.get_running_loop()
        
        def progress_callback(data: Dict[str, str]) -> None:
            """Thread-safe synchronous progress callback for face matching."""            
            progress_data: JsonDict = {
                "person_name": person_name,
                **data
            }
       
            asyncio.run_coroutine_threadsafe(
                self._send_message(websocket, MessageType.FACE_MATCHING_PROGRESS, progress_data, job_id=job_id),
                loop
            )
            logger.debug(f"Sent face matching progress: {progress_data}")
          
        
        try:
            from face_matcher import find_and_label_matching_faces
            
            logger.info(f"Running face matching for {person_name}")
            result: FaceMatchingResult = await find_and_label_matching_faces(
                person_name=person_name,
                reference_image_paths=reference_images,
                unknown_faces_dir=unknown_faces_dir,
                tolerance=tolerance,
                progress_callback=progress_callback
            )
            
            if result["success"]:
                logger.info(f"Face matching complete: {result['matches_found']} matches found for {person_name}")
                complete_data: JsonDict = {
                    "person_name": person_name,
                    "matches_found": result["matches_found"],
                    "matches": result["matches"],
                    "reference_images_used": result["reference_images_used"]
                }
                try:
                    await self._send_message(
                        websocket,
                        MessageType.FACE_MATCHING_COMPLETE,
                        complete_data,
                        job_id=job_id
                    )
                except Exception as e:
                    logger.warning(f"Failed to send face matching complete event: {e}")
            else:
                await self._send_message(
                    websocket,
                    MessageType.FACE_MATCHING_ERROR,
                    {"message": result.get("error", "Unknown error")},
                    job_id=job_id
                )
        
        except Exception as e:
            logger.exception(f"Face matching failed for {person_name}")
            await self._send_message(
                websocket,
                MessageType.FACE_MATCHING_ERROR,
                {"message": f"Face matching failed: {str(e)}"},
                job_id=job_id
            )
        finally:
            guard.cancel()
            self.active_guards.discard(guard)


    async def _handle_reindex_faces(
        self, websocket: "WebSocketServerProtocol", payload: JsonDict
    ) -> None:
        """Handle face reindexing request with exclusive locking."""
        if self.reindex_lock.locked():
            logger.warning("Reindex request received while another reindex is active.")
            await self._send_message(
                websocket,
                MessageType.REINDEX_ERROR,
                {"message": "Face reindexing is already in progress. Please wait."}
            )
            return

        job_id = payload.get("job_id")
        specific_faces = payload.get("specific_faces")
        if not isinstance(job_id, str):
            logger.error("Missing or invalid 'job_id' in payload")
            job_id = None

        async with self.reindex_lock:
            logger.info("Starting face reindexing...")
            
            faces_dir = os.getenv("FACES_DIR", ".faces")
            known_faces_f = os.getenv("KNOWN_FACES_FILE_LOADED", ".known_faces.json")
            
            if not isinstance(faces_dir, str):
                faces_dir = ".faces"
            if not isinstance(known_faces_f, str):
                known_faces_f = "known_faces.json"
            
            guard = CallbackGuard(websocket, self.connection_manager)
            self.active_guards.add(guard)
            
            loop = asyncio.get_running_loop()
            
            def reindex_progress_callback(data: Dict[str, Union[str, int]]) -> None:
                """Thread-safe synchronous progress callback for reindexing."""
                if not guard.is_active():
                    return
                
                elapsed = data.get("elapsed", "")
                progress = data.get("progress", 0)
                
                if not isinstance(elapsed, str):
                    elapsed = str(elapsed)
                if not isinstance(progress, int):
                    progress = 0
                
                progress_data: JsonDict = {
                    "elapsed": elapsed,
                    "progress": progress
                }
                
                asyncio.run_coroutine_threadsafe(
                    self._send_message(websocket, MessageType.REINDEX_PROGRESS, progress_data, job_id=job_id),
                    loop
                    )
               

            try:
                logger.info("Running face reindexing")
                success = await batch_add_faces_from_folder(
                    progress_callback=reindex_progress_callback,
                    specific_faces=specific_faces
                )
                
                if success:
                    logger.info("Face reindexing completed successfully.")
                    complete_data: JsonDict = {
                        "status": "done",
                        "message": "Face reindexing completed successfully."
                    }
                    try:
                        await self._send_message(
                            websocket,
                            MessageType.REINDEX_COMPLETE,
                            complete_data,
                            job_id=job_id
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send reindex complete event: {e}")
                else:
                    logger.error("Face reindexing failed. Check logs for details.")
                    await self._send_message(
                        websocket,
                        MessageType.REINDEX_ERROR,
                        {"message": "Face reindexing failed. Check service logs."},
                        job_id=job_id
                    )
            
            except Exception as e:
                logger.exception("Face reindexing exception")
                await self._send_message(
                    websocket,
                    MessageType.REINDEX_ERROR,
                    {"message": f"Reindexing failed: {str(e)}"},
                    job_id=job_id
                )
            finally:
                guard.cancel()
                self.active_guards.discard(guard)
class WebSocketHandler:
    """Coordinates WebSocket connections and message processing."""
    
    def __init__(
        self, service_state: "ServiceState", max_concurrent_analyses: int
    ) -> None:
        self.connection_manager: "ConnectionManager" = ConnectionManager()
        self.message_handler: "MessageHandler" = MessageHandler(
            service_state, self.connection_manager, max_concurrent_analyses
        )
    
    async def handle_connection(self, websocket: "WebSocketServerProtocol") -> None:
        """Handle incoming WebSocket connection lifecycle."""
        await self.connection_manager.register(websocket)
        client_addr = websocket.remote_address
        connection_id = f"{client_addr}_{datetime.now().strftime('%H%M%S%f')}"
        async def heartbeat():
            try:
                while True:
                    if websocket.closed:
                        break
                    await websocket.send(json.dumps({"type": "ping", "ts": datetime.now().isoformat()}))
                    await asyncio.sleep(30)  # send heartbeat every 30s
            except Exception:
                pass
        heartbeat_task = asyncio.create_task(heartbeat())
        try:
            async for message in websocket:
                if isinstance(message, str):
                    try:
                        data = json.loads(message)
                    except json.JSONDecodeError:
                        logger.warning(f"Received non-JSON string from {connection_id}")
                        continue

                    if data.get("type") == "ping":
                        await websocket.send(json.dumps({"type": "pong"}))
                        continue

                    await self.message_handler.process_message(websocket, message)

                else:
                    logger.warning(f"Received non-string message from {connection_id}")

        except ConnectionClosedOK:
            logger.info(f"Client disconnected normally: {connection_id}")
        except ConnectionClosedError as e:
            logger.warning(f"Client disconnected with error: {connection_id} - {e.code}")
        except ConnectionClosed as e:
            logger.info(f"Client disconnected: {connection_id} - {e}")
        except Exception as e:
            logger.exception(f"Unhandled exception in WebSocket handler for {connection_id}")
        finally:
            # Cancel all callbacks for this connection
            heartbeat_task.cancel()
            self.message_handler.cleanup_guards(websocket)
            await self.connection_manager.unregister(websocket)


class AnalysisService:
    """Main service coordinator."""
    
    def __init__(self, max_concurrent_analyses: int = 3) -> None:
        self.state: "ServiceState" = ServiceState()
        self.handler: "WebSocketHandler" = WebSocketHandler(
            self.state, max_concurrent_analyses
        )
        logger.info(
            f"Service initialized (max concurrent analyses: {max_concurrent_analyses})"
        )
    
    async def start(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        socket_path: Optional[str] = None,
    ) -> None:
        """Start the WebSocket server."""
        if socket_path:
            path = Path(socket_path)
            if path.exists():
                logger.warning(f"Removing stale socket file: {path}")
                path.unlink()
            
            logger.info(f"Starting service on Unix Domain Socket: {socket_path}")
            async with websockets.unix_serve(self.handler.handle_connection, socket_path):
                logger.info(f"Server listening on {socket_path}")
                await asyncio.Future()  # Run forever
        
        elif host and port:
            logger.info(f"Starting service on {host}:{port}")
            # Extended timeouts for long-running transcriptions (hours-long videos)
            async with websockets.serve(
                self.handler.handle_connection, 
                host, 
                port,
                ping_interval=30,      # Send ping every 30 seconds
                ping_timeout=3600,     # Allow 1 hour without pong response
                close_timeout=60,      # Wait 60s for close handshake
                max_queue=None
            ):
                logger.info(f"Server listening on {host}:{port}")
                await asyncio.Future()  # Run forever
    
        else:
            raise ValueError("Either socket_path or (host and port) must be provided")


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Edit Mind Analysis Service - WebSocket-based video analysis"
    )

    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--socket",
        type=str,
        help="Path to the Unix Domain Socket"
    )

    parser.add_argument(
        "--host",
        type=str,
        help="Host to bind to (e.g., 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        help="TCP port to listen on"
    )

    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=3,
        help="Maximum number of concurrent video analyses (default: 3)"
    )

    args = parser.parse_args()

    # Validate combination
    if not args.socket and not (args.host and args.port):
        parser.error("You must specify either --socket OR both --host and --port")

    return args


async def main() -> None:
    """Application entry point."""
    args = parse_arguments()

    service = AnalysisService(max_concurrent_analyses=args.max_concurrent)

    try:
        if args.socket:
            await service.start(socket_path=args.socket)
        else:
            await service.start(host=args.host, port=args.port)
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.exception(f"Service failed to start: {e}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service stopped")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)