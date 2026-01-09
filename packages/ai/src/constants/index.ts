import 'dotenv/config'

// Local AI model Settings with node-llam-cpp
export const SEARCH_AI_MODEL = process.env.SEARCH_AI_MODEL
export const USE_LOCAL = process.env.USE_LOCAL_MODEL === 'true'

// Gemini Settings
export const GEMINI_MODEL_NAME = 'gemini-2.5-pro'
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
export const USE_GEMINI = process.env.USE_GEMINI === 'true'

// Ollama Settings
export const USE_OLLAMA_MODEL = process.env.USE_OLLAMA_MODEL === 'true'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct'
export const OLLAMA_HOST = process.env.OLLAMA_HOST
export const OLLAMA_PORT = process.env.OLLAMA_PORT
