import { logger } from '../services/logger'
import { pythonService } from '../services/pythonService'
import { TranscriptionProgress } from '../types/transcription'

type ProgressCallback = (progress: TranscriptionProgress) => void

export function transcribeAudio(
  videoPath: string,
  jsonFilePath: string,
  jobId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    pythonService.transcribe(
      videoPath,
      jsonFilePath,
      jobId,
      async (progress: TranscriptionProgress) => {
        if (onProgress) {
          try {
            onProgress(progress)
          } catch (error) {
            logger.error('❌ Error in progress callback:' + error)
          }
        }
      },
      (result) => {
        resolve(result)
      },
      (error) => {
        reject(error)
      }
    )
  })
}
