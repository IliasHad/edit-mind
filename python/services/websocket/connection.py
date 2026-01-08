"""WebSocket connection management."""
import asyncio
import json
from typing import Set, Optional
from websockets.legacy.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK, ConnectionClosedError

from core.types import MessageType, JsonDict
from services.logger import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message sending."""

    def __init__(self):
        self._connections: Set[WebSocketServerProtocol] = set()
        self._lock = asyncio.Lock()

    async def register(self, websocket: WebSocketServerProtocol) -> None:
        """Register a new connection."""
        async with self._lock:
            self._connections.add(websocket)
            logger.info(
                f"Client connected: {websocket.remote_address} "
                f"(total: {len(self._connections)})"
            )

    async def unregister(self, websocket: WebSocketServerProtocol) -> None:
        """Unregister a connection."""
        async with self._lock:
            self._connections.discard(websocket)
            logger.info(
                f"Client disconnected: {websocket.remote_address} "
                f"(total: {len(self._connections)})"
            )

    def is_connected(self, websocket: WebSocketServerProtocol) -> bool:
        """Check if connection is active."""
        return websocket in self._connections and websocket.open

    def get_connection_count(self) -> int:
        """Get number of active connections."""
        return len(self._connections)

    async def send_message(
        self,
        websocket: WebSocketServerProtocol,
        msg_type: MessageType,
        payload: JsonDict,
        job_id: Optional[str] = None
    ) -> bool:
        """
        Send message to client with error handling.

        Returns:
            True if sent successfully, False otherwise.
        """
        if not self.is_connected(websocket):
            logger.debug(f"Cannot send {msg_type.value}: connection inactive")
            return False

        try:
            message_data = {
                "type": msg_type.value,
                "payload": payload
            }

            if job_id:
                message_data["payload"]["job_id"] = job_id

            message = json.dumps(message_data)
            await websocket.send(message)
            return True

        except ConnectionClosedOK:
            logger.debug(
                f"Connection closed normally while sending {msg_type.value}")
            return False
        except ConnectionClosedError as e:
            logger.debug(
                f"Connection error while sending {msg_type.value}: {e.code}")
            return False
        except ConnectionClosed as e:
            logger.debug(f"Connection closed while sending {msg_type.value}")
            return False
        except Exception as e:
            logger.warning(f"Unexpected error sending {msg_type.value}: {e}")
            return False

    async def broadcast(
        self,
        msg_type: MessageType,
        payload: JsonDict
    ) -> int:
        """
        Broadcast message to all connected clients.

        Returns:
            Number of successful sends.
        """
        success_count = 0

        for websocket in list(self._connections):
            if await self.send_message(websocket, msg_type, payload):
                success_count += 1

        return success_count


class CallbackGuard:
    """Guards callbacks from executing on closed connections."""

    def __init__(
        self,
        websocket: WebSocketServerProtocol,
        connection_manager: ConnectionManager
    ):
        self.websocket = websocket
        self.connection_manager = connection_manager
        self._cancelled = False

    def cancel(self) -> None:
        """Cancel this guard."""
        self._cancelled = True

    def is_active(self) -> bool:
        """Check if callback should execute."""
        return (
            not self._cancelled and
            self.connection_manager.is_connected(self.websocket)
        )

    def __enter__(self) -> "CallbackGuard":
        return self

    def __exit__(self, *args) -> None:
        self.cancel()
