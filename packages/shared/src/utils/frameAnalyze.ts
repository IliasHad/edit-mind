import { Analysis, AnalysisProgress } from '../types/analysis'
import { pythonService } from '../services/pythonService'
import { logger } from '../services/logger'

/**
 * Analyzes a video file using the persistent Python analysis service.
 * @param videoPath The full path to the video file.
 * @param onProgress Callback for progress updates.
 */
export function analyzeVideo(
  videoPath: string,
  jsonFilePath: string,
  jobId: string,
  onProgress: (progress: AnalysisProgress) => void
): Promise<Analysis | undefined> {
  return new Promise((resolve, reject) => {
    pythonService.analyzeVideo(
      videoPath,
      jsonFilePath,
      jobId,
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
        resolve(data)
      },
      (error) => {
        reject(error)
      }
    )
  })
}
