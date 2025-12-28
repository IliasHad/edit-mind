import * as path from 'path'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.resolve('../../.env.testing') })
} else {
  dotenv.config({})
}

export const EMBEDDING_MODEL = 'text-embedding-004'
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
export const SEARCH_AI_MODEL = process.env.SEARCH_AI_MODEL
export const USE_LOCAL = process.env.USE_LOCAL_MODEL === 'true'
export const USE_OLLAMA_MODEL = true
export const OLLAMA_MODEL = 'qwen2.5:7b-instruct'
export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-lite'

