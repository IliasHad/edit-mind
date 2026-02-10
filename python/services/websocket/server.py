"""WebSocket server implementation."""
import asyncio
import json
from datetime import datetime
from typing import Optional
from websockets.server import ServerConnection, serve
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK, ConnectionClosedError

from core.config import ServerConfig, AnalysisConfig, TranscriptionConfig
from services.websocket.connection import ConnectionManager
from services.websocket.messages import MessageRouter
from services.websocket.handlers import MessageHandlers
from services.state import ServiceState
from services.analysis.service import AnalysisService
from services.transcription.service import TranscriptionService
from core.types import MessageType
from services.logger import get_logger

logger = get_logger(__name__)


class WebSocketServer:
    """WebSocket server for video processing."""

    def __init__(
        self,
        server_config: ServerConfig,
        analysis_config: Optional[AnalysisConfig] = None,
        transcription_config: Optional[TranscriptionConfig] = None
    ):
        self.server_config = server_config

        # Initialize components
        self.connection_manager = ConnectionManager()
        self.service_state = ServiceState()

        # Set concurrent limits from server config
        self.service_state.max_concurrent_analyses = server_config.max_concurrent_analyses
        self.service_state.max_concurrent_transcriptions = server_config.max_concurrent_transcriptions

        # Initialize services
        self.analysis_service = AnalysisService(analysis_config)
        self.transcription_service = TranscriptionService(transcription_config)

        # Initialize message handling
        self.message_router = MessageRouter(
            self.connection_manager,
            self.service_state
        )

        self.message_handlers = MessageHandlers(
            self.connection_manager,
            self.service_state,
            self.analysis_service,
            self.transcription_service
        )

        # Register handlers
        self._register_handlers()

        logger.info(
            f"Server initialized - "
            f"Max concurrent analyses: {self.service_state.max_concurrent_analyses}, "
            f"Max concurrent transcriptions: {self.service_state.max_concurrent_transcriptions}"
        )

    def _register_handlers(self) -> None:
        """Register message type handlers."""
        self.message_router.register_handler(
            MessageType.HEALTH,
            self.message_handlers.handle_health
        )
        self.message_router.register_handler(
            MessageType.ANALYZE,
            self.message_handlers.handle_analyze
        )
        self.message_router.register_handler(
            MessageType.TRANSCRIBE,
            self.message_handlers.handle_transcribe
        )

    async def handle_connection(self, websocket: ServerConnection) -> None:
        """Handle a WebSocket connection lifecycle."""
        await self.connection_manager.register(websocket)

        client_addr = websocket.remote_address
        connection_id = f"{client_addr}_{datetime.now().strftime('%H%M%S%f')}"


        try:
            async for message in websocket:
                if isinstance(message, str):
                    await self.message_router.route_message(websocket, message)
                else:
                    logger.warning(
                        f"Received non-string message from {connection_id}")

        except ConnectionClosedOK:
            logger.info(f"Client disconnected normally: {connection_id}")
        except ConnectionClosedError as e:
            if e.code == 1006:
                logger.info(f"Client disconnected abruptly: {connection_id}")
            else:
                logger.warning(f"Client disconnected with error: {connection_id} - {e.code}")
        except ConnectionClosed as e:
            logger.info(f"Client disconnected: {connection_id}")
        except Exception as e:
            logger.exception(f"Unhandled exception for {connection_id}")
        finally:
            self.message_router.cleanup_guards(websocket)
            await self.connection_manager.unregister(websocket)

    async def start(self) -> None:
        """Start the WebSocket server."""
        from pathlib import Path

        if self.server_config.socket_path:
            # Unix domain socket
            socket_path = Path(self.server_config.socket_path)
            if socket_path.exists():
                logger.warning(f"Removing stale socket: {socket_path}")
                socket_path.unlink()

            logger.info(f"Starting server on Unix socket: {socket_path}")

            # Import unix_serve for Unix sockets
            from websockets.server import unix_serve

            async with unix_serve(
                self.handle_connection,
                str(socket_path)
            ):
                logger.info(f"Server listening on {socket_path}")
                await asyncio.Future()

        else:
            # TCP socket
            logger.info(
                f"Starting server on {self.server_config.host}:{self.server_config.port}"
            )

            async with serve(
                self.handle_connection,
                self.server_config.host,
                self.server_config.port,
                ping_interval=self.server_config.ping_interval,
                ping_timeout=self.server_config.ping_timeout,
                close_timeout=self.server_config.close_timeout,
            ):
                logger.info(
                    f"Server listening on "
                    f"{self.server_config.host}:{self.server_config.port}"
                )
                await asyncio.Future()

    def cleanup(self) -> None:
        """Cleanup server resources."""
        logger.info("Cleaning up server resources...")
        self.analysis_service.plugin_manager.cleanup_plugins_models()
        self.analysis_service.cleanup()
        self.transcription_service.cleanup()
