"""WebSocket message handlers."""
from typing import Callable
from websockets.legacy.server import WebSocketServerProtocol

from core.types import MessageType, JsonDict, AnalysisCancelledError, TranscriptionCancelledError
from core.errors import InvalidRequestError, VideoNotFoundError
from services.websocket.connection import ConnectionManager
from services.websocket.messages import RequestParser
from services.state import ServiceState
from services.analysis.service import AnalysisService
from services.transcription.service import TranscriptionService
from services.logger import get_logger
import os
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
import asyncio

logger = get_logger(__name__)


class MessageHandlers:
    """Handles different message types from clients."""

    def __init__(
        self,
        connection_manager: ConnectionManager,
        service_state: ServiceState,
        analysis_service: AnalysisService,
        transcription_service: TranscriptionService
    ):
        self.connection_manager = connection_manager
        self.service_state = service_state
        self.analysis_service = analysis_service
        self.transcription_service = transcription_service

        self.use_external_host = os.getenv("USE_EXTERNAL_HOST", False)

    async def handle_health(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle health check request."""
        health_data = {
            **self.service_state.get_health_status(),
            'active_connections': self.connection_manager.get_connection_count(),
            'health': self.service_state.get_health_status()
        }
        await self.connection_manager.send_message(
            websocket,
            MessageType.STATUS,
            health_data
        )

    async def handle_analyze(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle video analysis request."""
        try:
            # Parse request
            request = RequestParser.parse_analysis_request(payload)

            # Validate
            RequestParser.validate_video_path(request.video_path)

            # Check if already processing
            if self.service_state.is_processing(request.video_path):
                await self.connection_manager.send_message(
                    websocket,
                    MessageType.ANALYSIS_ERROR,
                    {"message": f"Video already being processed: {request.video_path}"},
                    job_id=request.job_id
                )
                return

            # Start analysis
            self.service_state.start_analysis(request.video_path)

                # Create progress callback
            progress_callback = self._create_analysis_progress_callback(
                    websocket,
                    request.job_id
    
                )
            async def run():
                      try:
                            success = False
                            # Process
                            result = await self.analysis_service.process_async(
                                request,
                                progress_callback
                            )

                            # Send result
                            if result.error:
                                await self.connection_manager.send_message(
                                    websocket,
                                    MessageType.ANALYSIS_ERROR,
                                    {"message": f"Analysis failed: {result.error}"},
                                    job_id=request.job_id
                                )
                                success = False
                            else:
                                if self.use_external_host:
                                    logger.warning(
                                        "You are using external host for the video processing, please make sure to run on the same host as you docker containers")
                                    return_data = result.to_dict()

                                else:
                                    return_data = {}
                                    # In case we're using this script inside a docker service, we can save the data over the json file path passed directly,
                                    # fo external host, we will be sending the json data over websocket
                                    self.analysis_service.save_result(
                                        result, request.json_file_path)

                                await self.connection_manager.send_message(
                                    websocket,
                                    MessageType.ANALYSIS_COMPLETED,
                                    return_data,
                                    job_id=request.job_id
                                )
                                success = True
                                logger.info(f"Analysis complete: {request.video_path}")
                                
                      except AnalysisCancelledError:
                            logger.info(f"Frame Analysis job {request.job_id} was cancelled")
                      except Exception as e:
                                logger.exception(f"Analysis error: {e}")
                                await self.connection_manager.send_message(
                                    websocket,
                                    MessageType.ANALYSIS_ERROR,
                                    {"message": str(e)},
                                    job_id=request.job_id
                                )
                                success = False
                      finally:
                            self.service_state.finish_analysis(request.video_path, success)
                    
            asyncio.create_task(run()) 

        except InvalidRequestError as e:
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": str(e)}
            )
        except VideoNotFoundError as e:
            await self.connection_manager.send_message(
                websocket,
                MessageType.ANALYSIS_ERROR,
                {"message": str(e)},
                job_id=payload.get('job_id')
            )
        except Exception as e:
            logger.exception("Unexpected error handling analysis")
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": f"Internal error: {str(e)}"}
            )

    async def handle_transcribe(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle transcription request."""
        try:
            # Parse request
            request = RequestParser.parse_transcription_request(payload)

            # Validate
            RequestParser.validate_video_path(request.video_path)

            # Check if already processing
            if self.service_state.is_processing(request.video_path):
                await self.connection_manager.send_message(
                    websocket,
                    MessageType.TRANSCRIPTION_ERROR,
                    {"message": f"Video already being processed: {request.video_path}"},
                    job_id=request.job_id
                )
                return

            # Start transcription
            self.service_state.start_transcription(request.video_path)

                # Create progress callback
            progress_callback = self._create_transcription_progress_callback(
                    websocket,
                    request.job_id,
                    request.video_path
            )
            async def run():
                    try:

                        success = False
                        # Process
                        result = await self.transcription_service.process_async(
                            request,
                            progress_callback
                        )

                        if self.use_external_host:
                            logger.warning(
                                "You are using external host for the video processing, please make sure to run on the same host as you docker containers")
                            return_data = result.to_dict()

                        else:
                            return_data = {}
                            # In case we're using this script inside a docker service, we can save the data over the json file path passed directly,
                            # fo external host, we will be sending the json data over websocket

                            self.transcription_service.save_result(
                                result, request.json_file_path)

                        # Send result
                        await self.connection_manager.send_message(
                            websocket,
                            MessageType.TRANSCRIPTION_COMPLETED,
                            return_data,
                            job_id=request.job_id
                        )
                        logger.info(f"Transcription complete: {request.video_path}")
                        success = True
                        
                    except TranscriptionCancelledError:
                            logger.info(f"Transcription job {request.job_id} was cancelled")
                    except Exception as e:
                        logger.exception(f"Transcription error: {e}")
                        await self.connection_manager.send_message(
                            websocket,
                            MessageType.TRANSCRIPTION_ERROR,
                            {
                                "message": str(e),
                                "video_path": request.video_path
                            },
                            job_id=request.job_id
                        )
                        success = False
                    finally:
                        self.service_state.finish_transcription(
                            request.video_path, success)
                
            asyncio.create_task(run()) 

        except InvalidRequestError as e:
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": str(e)}
            )
        except VideoNotFoundError as e:
            await self.connection_manager.send_message(
                websocket,
                MessageType.TRANSCRIPTION_ERROR,
                {"message": str(e)},
                job_id=payload.get('job_id')
            )
        except Exception as e:
            logger.exception("Unexpected error handling transcription")
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": f"Internal error: {str(e)}"}
            )

    def _create_analysis_progress_callback(
        self,
        websocket: WebSocketServerProtocol,
        job_id: str
    ) -> Callable:
        """Create progress callback for analysis."""
        async def callback(progress: float, elapsed: float, processed: float, total: float):
            logger.debug({
                "progress": progress,
                "elapsed": elapsed,
                "frames_analyzed": processed,
                "total_frames": total
            })
            try:
                await self.connection_manager.send_message(
                    websocket,
                    MessageType.ANALYSIS_PROGRESS,
                    {
                        "progress": progress,
                        "elapsed": elapsed,
                        "frames_analyzed": processed,
                        "total_frames": total
                    },
                    job_id=job_id
                )
            except ConnectionClosedOK:
                logger.debug(
                    f"Client disconnected normally; skipping progress update for {job_id}")
            except ConnectionClosedError:
                logger.debug(
                    f"Client disconnected abruptly; skipping progress update for {job_id}")
            except Exception as e:
                logger.warning(f"Failed to send progress update: {e}")
        return callback

    def _create_transcription_progress_callback(
        self,
        websocket: WebSocketServerProtocol,
        job_id: str,
        video_path: str
    ) -> Callable:
        """Create progress callback for transcription."""
        async def callback(progress: int, elapsed: str):
            logger.debug({
                "progress": progress,
                "elapsed": elapsed,
                "video_path": video_path
            })
            try:
                await self.connection_manager.send_message(
                    websocket,
                    MessageType.TRANSCRIPTION_PROGRESS,
                    {
                        "progress": progress,
                        "elapsed": elapsed,
                        "video_path": video_path
                    },
                    job_id=job_id
                )
            except ConnectionClosedOK:
                logger.debug(
                    f"Client disconnected normally; skipping progress update for {job_id}")
            except ConnectionClosedError:
                logger.debug(
                    f"Client disconnected abruptly; skipping progress update for {job_id}")
            except Exception as e:
                logger.warning(f"Failed to send progress update: {e}")
        return callback
    
    async def handle_cancel_transcription(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle transcription cancellation request."""
        job_id = payload.get('job_id')
        logger.info(f"Received cancellation request for transcription job: {job_id}")

        if not job_id:
            logger.warning("Received cancel_transcription without job_id")
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": "Missing job_id in cancel_transcription payload"}
            )
            return

        self.transcription_service.cancel(job_id)
        logger.info(f"Transcription job {job_id} cancelled successfully")

        await self.connection_manager.send_message(
            websocket,
            MessageType.TRANSCRIPTION_COMPLETED,
            {"message": "Transcription cancelled", "cancelled": True, 'job_id': job_id},
            job_id=job_id
        )

    async def handle_cancel_analysis(
        self,
        websocket: WebSocketServerProtocol,
        payload: JsonDict
    ) -> None:
        """Handle analysis cancellation request."""
        job_id = payload.get('job_id')
        logger.info(f"Received cancellation request for frame analysis job :{job_id}")
        
        if not job_id:
            logger.warning("Received cancel_analysis without job_id")
            await self.connection_manager.send_message(
                websocket,
                MessageType.ERROR,
                {"message": "Missing job_id in cancel_analysis payload"}
            )
            return

        self.analysis_service.cancel(job_id)
        logger.info(f"Analysis job {job_id} cancelled successfully")

        await self.connection_manager.send_message(
            websocket,
            MessageType.ANALYSIS_COMPLETED,
            {"message": "Analysis cancelled", "cancelled": True, 'job_id': job_id},
            job_id=job_id
        )