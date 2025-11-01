import { VideoSearchParams } from '../types/search'
import { CACHE_TTL, SEARCH_AI_MODEL } from '@/lib/constants'
import { LlamaModel, LlamaContext } from 'node-llama-cpp'
import path from 'path'
import { z } from 'zod'

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable(),
  emotions: z.array(z.string()).default([]),
  shot_type: z.string().nullable(),
  aspect_ratio: z.string().nullable().default('16:9'),
  duration: z.number().positive().nullable(),
  description: z.string().min(1),
  outputFilename: z.string().min(1),
  objects: z.array(z.string()).default([]),
  transcriptionQuery: z.string().nullable(),
})
const SYSTEM_PROMPT = `Extract video search parameters from the user query into JSON format.

RULES:
1. Return ONLY valid JSON - no markdown, no explanations
2. All fields are required (use null or [] when not applicable)
3. Extract ALL mentioned emotions, objects, and parameters
4. Be precise with emotion detection - "looking happy" means emotions: ["happy"]

SCHEMA:
{
  "action": string | null,
  "emotions": ["happy"|"sad"|"surprised"|"angry"|"neutral"|"excited"|"calm"|"fear"|"disgust"],
  "shot_type": "close-up" | "medium-shot" | "long-shot" | null,
  "aspect_ratio": "16:9"|"9:16"|"1:1"|"4:3"|"21:9"|"8:7",
  "duration": number | null,
  "description": string,
  "outputFilename": string,
  "objects": string[],
  "transcriptionQuery": string | null
}

FIELD EXTRACTION:

action: Main verb/activity
- "running" → "running"
- "cooking with" → "cooking"
- "looking happy" → null (looking is not an action, it's describing emotion)
- "talking about" → "talking"
- null if no clear action

emotions: Extract ALL emotion words (ALWAYS array)
- "happy" → ["happy"]
- "looking happy" → ["happy"]
- "sad and angry" → ["sad", "angry"]
- none → []

shot_type: Camera framing
- "close-up" / "close up" / "closeup" → "close-up"
- "medium shot" / "medium-shot" → "medium-shot"
- "long shot" / "wide shot" → "long-shot"
- null if not mentioned

aspect_ratio: Video dimensions
- "vertical" / "portrait" / "9:16" → "9:16"
- "square" / "1:1" / "instagram" → "1:1"
- "horizontal" / "landscape" / "16:9" → "16:9"
- default → "16:9"

duration: Time in seconds
- "30 seconds" → 30
- "2 minutes" → 120
- "1 min 30 sec" → 90
- null if not mentioned

objects: Physical items (ALWAYS array, singular form)
- "laptop" → ["laptop"]
- "pans and knives" → ["pan", "knife"]
- "my dog" → ["dog"]
- none → []

transcriptionQuery: Quoted speech
- "says 'hello world'" → "hello world"
- "contains 'machine learning'" → "machine learning"
- null if not mentioned

description: Brief summary of the query

outputFilename: kebab-case filename (no extension)

EXAMPLES:

Query: "Create a 30 second vertical video of me looking happy"
{"action":null,"emotions":["happy"],"shot_type":null,"aspect_ratio":"9:16","duration":30,"description":"30 second vertical video showing happy emotion","outputFilename":"happy-vertical-30s","objects":[],"transcriptionQuery":null}

Query: "Find all close-ups where @Ilias is surprised and there's a laptop"
{"action":null,"emotions":["surprised"],"shot_type":"close-up","aspect_ratio":"16:9","duration":null,"description":"close-up shots of surprised person with laptop","outputFilename":"surprised-laptop-closeup","objects":["laptop"],"transcriptionQuery":null}

Query: "Show me clips where I say 'machine learning is awesome'"
{"action":"talking","emotions":[],"shot_type":null,"aspect_ratio":"16:9","duration":null,"description":"clips with machine learning phrase","outputFilename":"machine-learning-clips","objects":[],"transcriptionQuery":"machine learning is awesome"}

Query: "2 minute video of cooking with pans and knives"
{"action":"cooking","emotions":[],"shot_type":null,"aspect_ratio":"16:9","duration":120,"description":"2 minute cooking video with pans and knives","outputFilename":"cooking-pans-knives-2min","objects":["pan","knife"],"transcriptionQuery":null}

Query: "Compile happy and excited moments from last summer"
{"action":null,"emotions":["happy","excited"],"shot_type":null,"aspect_ratio":"16:9","duration":null,"description":"happy and excited summer moments compilation","outputFilename":"happy-excited-summer","objects":[],"transcriptionQuery":null}

Query: "Make a square Instagram post of my dog"
{"action":null,"emotions":[],"shot_type":null,"aspect_ratio":"1:1","duration":null,"description":"square format Instagram video of dog","outputFilename":"dog-instagram-square","objects":["dog"],"transcriptionQuery":null}

Now extract parameters from this query:`

class LlamaModelManager {
  private llama: any = null
  private model: LlamaModel | null = null
  private context: LlamaContext | null = null
  private responseCache = new Map<string, { result: VideoSearchParams; timestamp: number }>()

  async initialize() {
    if (this.model && this.context) return { model: this.model, context: this.context }

    if (!this.llama) {
      const { getLlama } = await import('node-llama-cpp')
      this.llama = await getLlama()
    }

    const modelPath = path.join(process.cwd(), 'models', SEARCH_AI_MODEL)

    this.model = await this.llama.loadModel({ modelPath })
    if (!this.model) throw new Error('Failed to load model')

    this.context = await this.model.createContext({
      sequences: 1,
      contextSize: 4096,
    })

    return { model: this.model, context: this.context }
  }

  async generateParams(query: string): Promise<VideoSearchParams> {
    const { context } = await this.initialize()
    const { LlamaChatSession } = await import('node-llama-cpp')
    const sequence = await context.getSequence()
    const session = new LlamaChatSession({ contextSequence: sequence })

    try {
      const response = await session.prompt(`${SYSTEM_PROMPT}${query}\n\nJSON OUTPUT:`, {
        maxTokens: 512,
        temperature: 0.1,
        topP: 0.9,
        topK: 40,
      })
      return this.parseAndValidate(response, query)
    } finally {
      session.dispose()
    }
  }

  private parseAndValidate(response: string, query: string): VideoSearchParams {
    const cleaned = response.trim().replace(/```(?:json)?\s*/g, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return this.createFallback(query)
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])

      const validated = VideoSearchParamsSchema.parse(parsed)

      return {
        ...validated,
        outputFilename: this.sanitizeFilename(validated.outputFilename),
      }
    } catch {
      return this.createFallback(query)
    }
  }

  private sanitizeFilename(filename: string): string {
    return (
      filename
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || `video-${Date.now()}`
    )
  }

  private createFallback(query: string): VideoSearchParams {
    return {
      action: null,
      emotions: [],
      shot_type: null,
      aspect_ratio: '16:9',
      duration: null,
      description: query || 'video search',
      outputFilename: this.sanitizeFilename(query) || `video-${Date.now()}`,
      objects: [],
      transcriptionQuery: null,
    }
  }

  getCachedResult(query: string): VideoSearchParams | null {
    const cacheKey = query.toLowerCase().trim()
    const cached = this.responseCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }

    if (cached) this.responseCache.delete(cacheKey)
    return null
  }

  setCachedResult(query: string, result: VideoSearchParams): void {
    const cacheKey = query.toLowerCase().trim()
    this.responseCache.set(cacheKey, { result, timestamp: Date.now() })
  }

  async cleanup() {
    await this.context?.dispose()
    await this.model?.dispose()
    this.context = null
    this.model = null
    this.llama = null
  }
}

const modelManager = new LlamaModelManager()

export async function generateActionFromPrompt(query: string, useCache = true): Promise<VideoSearchParams> {
  if (useCache) {
    const cached = modelManager.getCachedResult(query)
    if (cached) return cached
  }

  const result = await modelManager.generateParams(query)

  if (useCache) {
    modelManager.setCachedResult(query, result)
  }

  return result
}

export const generateActionFromPromptInternal = (query: string) => modelManager.generateParams(query)
export const cleanup = () => modelManager.cleanup()
