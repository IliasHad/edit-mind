import { Analysis, AnalysisProgress } from '../types/analysis'
import { pythonService } from '../services/pythonService'
import { logger } from '../services/logger'
import { DEFAULT_LANGUAGE, type AppLanguage } from '../types/language'

/**
 * Analyzes a video file using the persistent Python analysis service.
 * @param videoPath The full path to the video file.
 * @param onProgress Callback for progress updates.
 */
export function analyzeVideo(
  videoPath: string,
  jsonFilePath: string,
  jobId: string,
  language: AppLanguage = DEFAULT_LANGUAGE,
  onProgress: (progress: AnalysisProgress) => void
): Promise<Analysis | undefined> {
  return new Promise((resolve, reject) => {
    pythonService.analyzeVideo(
      videoPath,
      jsonFilePath,
      jobId,
      language,
      (progress) => {
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
