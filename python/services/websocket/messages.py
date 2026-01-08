"""WebSocket message handling and routing."""
import json
import urllib.parse
from pathlib import Path
from typing import Dict, Callable, Awaitable, Set
from websockets.legacy.server import WebSocketServerProtocol

from core.types import (
    MessageType, JsonDict, AnalysisRequest, TranscriptionRequest
)
from core.errors import InvalidRequestError, VideoNotFoundError
from services.websocket.connection import ConnectionManager, CallbackGuard
from services.state import ServiceState
from services.logger import get_logger
import os

logger = get_logger(__name__)


class MessageRouter:
    """Routes WebSocket messages to appropriate handlers."""

    def __init__(
        self,
        connection_manager: ConnectionManager,
        service_state: ServiceState
    ):
        self.connection_manager = connection_manager
        self.service_state = service_state
        self._handlers: Dict[str, Callable] = {}
        self._active_guards: Set[CallbackGuard] = set()

    def register_handler(
        self,
        message_type: MessageType,
        handler: Callable[[WebSocketServerProtocol, JsonDict], Awaitable[None]]
    ) -> None:
        """Register a message handler."""
        self._handlers[message_type.value] = handler

    async def route_message(
        self,
        websocket: WebSocketServerProtocol,
        message: str
    ) -> None:
        """Route incoming message to appropriate handler."""
        try:
            data = json.loads(message)

            message_type = data.get("type")
            payload = data.get("payload", {})

            # Validate message structure
            if not isinstance(message_type, str):
                await self._send_error(websocket, "Message type must be a string")
                return

            if not isinstance(payload, dict):
                await self._send_error(websocket, "Payload must be an object")
                return

            # Handle ping/pong
            if message_type == MessageType.PING.value:
                await self.connection_manager.send_message(
                    websocket, MessageType.PONG, {}
                )
                return

            # Route to handler
            handler = self._handlers.get(message_type)
            if handler:
                await handler(websocket, payload)
            else:
                await self._send_error(
                    websocket,
                    f"Unknown message type: {message_type}"
                )

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self._send_error(websocket, "Invalid JSON format")
        except Exception as e:
            logger.exception("Error routing message")
            await self._send_error(websocket, f"Internal error: {str(e)}")

    async def _send_error(
        self,
        websocket: WebSocketServerProtocol,
        message: str
    ) -> None:
        """Send error message to client."""
        await self.connection_manager.send_message(
            websocket,
            MessageType.ERROR,
            {"message": message}
        )

    def create_guard(self, websocket: WebSocketServerProtocol) -> CallbackGuard:
        """Create a callback guard for this websocket."""
        guard = CallbackGuard(websocket, self.connection_manager)
        self._active_guards.add(guard)
        return guard

    def cleanup_guards(self, websocket: WebSocketServerProtocol) -> None:
        """Cancel all guards for a websocket."""
        for guard in list(self._active_guards):
            if guard.websocket == websocket:
                guard.cancel()
                self._active_guards.discard(guard)


class RequestParser:
    """Parses and validates incoming requests."""

    @staticmethod
    def parse_analysis_request(payload: JsonDict) -> AnalysisRequest:
        """Parse analysis request from payload."""
        try:
            use_external_host = os.getenv("USE_EXTERNAL_HOST", False)
            host_media_path = os.getenv("HOST_MEDIA_PATH")

            video_path = urllib.parse.unquote(str(payload['video_path']))
            json_file_path = str(payload['json_file_path'])
            job_id = str(payload['job_id'])
            settings = payload.get('settings', {})

            if not isinstance(settings, dict):
                settings = {}

            if use_external_host:
                # TODO: If you wanna use your Apple computer with M chips to handle ML services (Advanced Usage) and make sure that the python script can access video file from docker container
                logger.warning(
                    "You are using external host for the video processing, please make sure to run on the same host as you docker containers")
                video_path = video_path.replace(
                    "/media/videos", host_media_path)

            return AnalysisRequest(
                video_path=video_path,
                job_id=job_id,
                json_file_path=json_file_path,
                settings=settings
            )
        except KeyError as e:
            raise InvalidRequestError(f"Missing required field: {e}")
        except Exception as e:
            raise InvalidRequestError(f"Invalid request format: {e}")

    @staticmethod
    def parse_transcription_request(payload: JsonDict) -> TranscriptionRequest:
        """Parse transcription request from payload."""
        try:
            use_external_host = os.getenv("USE_EXTERNAL_HOST", False)
            host_media_path = os.getenv("HOST_MEDIA_PATH")

            video_path = urllib.parse.unquote(str(payload['video_path']))
            json_file_path = str(payload['json_file_path'])
            job_id = str(payload['job_id'])

            if use_external_host:
                # TODO: If you wanna use your Apple computer with M chips to handle ML services (Advanced Usage) and make sure that the python script can access video file from docker container
                logger.warning(
                    "You are using external host for the video processing, please make sure to run on the same host as you docker containers")

                video_path = video_path.replace(
                    "/media/videos", host_media_path)
            return TranscriptionRequest(
                video_path=video_path,
                job_id=job_id,
                json_file_path=json_file_path
            )
        except KeyError as e:
            raise InvalidRequestError(f"Missing required field: {e}")
        except Exception as e:
            raise InvalidRequestError(f"Invalid request format: {e}")

    @staticmethod
    def validate_video_path(video_path: str) -> None:
        """Validate video file exists."""
        if not Path(video_path).exists():
            raise VideoNotFoundError(f"Video file not found: {video_path}")
