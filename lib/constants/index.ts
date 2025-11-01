
import path from 'path';
import { resolve } from 'path';
import 'dotenv/config'

// General
export const IS_WIN = process.platform === 'win32';

// Directories
export const THUMBNAILS_DIR = path.resolve('.thumbnails');
export const FACES_DIR = path.resolve('.faces');
export const PROCESSED_VIDEOS_DIR = path.resolve('.results');
export const UNKNOWN_FACES_DIR = resolve('analysis_results/unknown_faces');
export const CACHE_FILE = '.locations.json';

// Timeouts and Intervals
export const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SERVICE_STARTUP_TIMEOUT = 60000; // 60 seconds
export const HEALTH_CHECK_INTERVAL = 1000; // 1 second

// Service settings
export const MAX_RESTARTS = 10;
export const RESTART_BACKOFF_MS = 1000;
export const EMBEDDING_BATCH_SIZE = 200;
export const MAX_DEPTH = 5;

// ChromaDB
export const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
export const CHROMA_PORT = process.env.CHROMA_PORT || '8000';
export const COLLECTION_NAME = 'video_content';

// AI Models
export const SEARCH_AI_MODEL = 'Llama-3.2-3B-Instruct-Q4_K_M.gguf'


// Files
export const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv)$/i
export const DEFAULT_FPS = 30
export const THUMBNAIL_SCALE = '320:-1'
export const THUMBNAIL_QUALITY = '4'
export const BATCH_THUMBNAIL_QUALITY = '3'
