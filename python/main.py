import sys
import asyncio
import argparse

from core.config import ServerConfig, AnalysisConfig, TranscriptionConfig
from services.websocket.server import WebSocketServer
from services.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Edit Mind Video Analysis & Transcription Service"
    )

    # Connection options
    connection_group = parser.add_mutually_exclusive_group()
    connection_group.add_argument(
        "--socket",
        type=str,
        help="Path to Unix Domain Socket"
    )

    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port to listen on (default: 8765)"
    )

    # Service configuration
    parser.add_argument(
        "--max-concurrent",
        type=int,
        default=4,
        help="Maximum concurrent jobs (default: 4)"
    )
    parser.add_argument(
        "--analysis-workers",
        type=int,
        help="Number of analysis workers (default: auto)"
    )
    parser.add_argument(
        "--sample-interval",
        type=float,
        default=2.5,
        help="Frame sampling interval in seconds (default: 2.5)"
    )
    parser.add_argument(
        "--target-resolution",
        type=int,
        default=720,
        help="Target frame resolution height (default: 720)"
    )

    # Transcription options
    parser.add_argument(
        "--whisper-model",
        type=str,
        default="medium",
        choices=["tiny", "base", "small", "medium", "large-v2", "large-v3"],
        help="Whisper model to use (default: medium)"
    )
    parser.add_argument(
        "--model-cache-dir",
        type=str,
        default="ml-models/.whisper",
        help="Model cache directory (default: ml-models/.whisper)"
    )

    # Performance options (Frame Analysis)
    parser.add_argument(
        "--aggressive-gc",
        action="store_true",
        help="Enable aggressive garbage collection"
    )
    parser.add_argument(
        "--buffer-limit",
        type=int,
        default=20,
        help="Frame buffer limit (default: 20)"
    )

    args = parser.parse_args()

    # Validate
    if not args.socket and not args.port:
        parser.error("Must specify either --socket or --port")

    return args


def create_server_config(args: argparse.Namespace) -> ServerConfig:
    """Create server configuration from arguments."""
    return ServerConfig(
        host=args.host if not args.socket else None,
        port=args.port if not args.socket else None,
        socket_path=args.socket,
        max_concurrent_jobs=args.max_concurrent
    )


def create_analysis_config(args: argparse.Namespace) -> AnalysisConfig:
    """Create analysis configuration from arguments."""
    config = AnalysisConfig(
        sample_interval_seconds=args.sample_interval,
        target_resolution_height=args.target_resolution,
        enable_aggressive_gc=args.aggressive_gc,
        frame_buffer_limit=args.buffer_limit
    )

    if args.analysis_workers:
        config.max_workers = args.analysis_workers

    return config


def create_transcription_config(args: argparse.Namespace) -> TranscriptionConfig:
    """Create transcription configuration from arguments."""
    return TranscriptionConfig(
        model_name=args.whisper_model,
        cache_dir=args.model_cache_dir
    )


async def main() -> None:
    """Application entry point."""
    args = parse_arguments()

    # Create configurations
    server_config = create_server_config(args)
    analysis_config = create_analysis_config(args)
    transcription_config = create_transcription_config(args)

    # Create and start server
    server = WebSocketServer(
        server_config,
        analysis_config,
        transcription_config
    )

    try:
        logger.info("Starting Video Processing Service")
        logger.info(f"Analysis workers: {analysis_config.max_workers}")
        logger.info(f"Whisper model: {transcription_config.model_name}")
        logger.info(
            f"Target resolution: {analysis_config.target_resolution_height}p")

        await server.start()

    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.exception(f"Service failed: {e}")
        raise
    finally:
        server.cleanup()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service stopped")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)
