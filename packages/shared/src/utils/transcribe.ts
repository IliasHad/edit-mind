import { logger } from '../services/logger'
import { pythonService } from '../services/pythonService'
import { Transcription, TranscriptionProgress } from '../types/transcription'
import { DEFAULT_LANGUAGE, type AppLanguage } from '../types/language'

type ProgressCallback = (progress: TranscriptionProgress) => void

export function transcribeAudio(
  videoPath: string,
  jsonFilePath: string,
  jobId: string,
  language: AppLanguage = DEFAULT_LANGUAGE,
  onProgress?: ProgressCallback
): Promise<Transcription | undefined> {
  return new Promise((resolve, reject) => {
    pythonService.transcribe(
      videoPath,
      jsonFilePath,
      jobId,
      language,
      async (progress: TranscriptionProgress) => {
        if (onProgress) {
          try {
            onProgress(progress)
          } catch (error) {
            logger.error('Error in progress callback:' + error)
          }
        }
      },
      (data) => {
        if (data.cancelled) {
          resolve(undefined) 
        } else {
          resolve(data)
        }
      },
      (error) => {
        reject(error)
      }
    )
  })
}
