interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
}

interface TranscriptionSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  confidence: number
  compression_ratio: number
  no_speech_prob: number
  words: TranscriptionWord[]
}

export interface Transcription {
  text: string
  segments: TranscriptionSegment[]
  language: string
}
export type TranscriptionProgress = {
  progress: number
  elapsed: string
  job_id: string
}
