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
  jobId: string,
  onProgress: (progress: AnalysisProgress) => void
): Promise<{ analysis: Analysis; category: string }> {
  return new Promise((resolve, reject) => {
    pythonService.analyzeVideo(
      videoPath,
      jobId,
      (progress) => {
        if (onProgress) {
          try {
            onProgress(progress)
          } catch (error) {
            logger.error('Error in progress callback: ' + error)
          }
        }
      },
      (result) => {
        let category = 'Uncategorized'
        if (result?.scene_analysis?.environment) {
          const env = result.scene_analysis.environment
          category = env.charAt(0).toUpperCase() + env.slice(1).replace(/_/g, ' ')
        }
        resolve({ analysis: result, category })
      },
      (error) => {
        logger.error('❌ ERROR CALLBACK EXECUTED: ' + error)
        reject(error)
      }
    )
  })
}
