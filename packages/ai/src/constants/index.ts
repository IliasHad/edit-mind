import 'dotenv/config'


// Gemini Settings
export const GEMINI_MODEL_NAME = 'gemini-2.5-pro'
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
export const USE_GEMINI = process.env.USE_GEMINI === 'true'

// Ollama Settings
export const USE_OLLAMA_MODEL = process.env.USE_OLLAMA_MODEL === 'true'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct'
export const OLLAMA_HOST = process.env.OLLAMA_HOST
export const OLLAMA_PORT = process.env.OLLAMA_PORT

// MiniMax Settings
export const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
export const USE_MINIMAX = process.env.USE_MINIMAX === 'true'
export const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M1'
