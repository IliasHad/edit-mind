import { Analysis, AnalysisProgress } from '../types/analysis'
import { pythonService } from '../services/pythonService'
import { logger } from '../services/logger'
import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'

// Timeout for analysis based on video complexity
// Long videos with many frames can take a while
const ANALYSIS_TIMEOUT_MS = 4 * 60 * 60 * 1000 // 4 hours
const FILE_CHECK_INTERVAL_MS = 30 * 1000 // Check every 30 seconds

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
    let resolved = false
    let lastFileSize = 0
    let fileCheckInterval: NodeJS.Timeout | null = null

    // Python saves analysis to analysis_results/<basename>_analysis.json
    const videoBasename = path.basename(videoPath, path.extname(videoPath))
    const analysisResultPath = `/app/analysis_results/${videoBasename}_analysis.json`

    // Parse analysis result and extract category
    const parseAnalysisResult = (result: Analysis): { analysis: Analysis; category: string } => {
      let category = 'Uncategorized'
      if (result?.scene_analysis?.environment) {
        const env = result.scene_analysis.environment
        category = env.charAt(0).toUpperCase() + env.slice(1).replace(/_/g, ' ')
      }
      return { analysis: result, category }
    }

    // File-based completion check as fallback
    const checkFileComplete = (): boolean => {
      try {
        if (existsSync(analysisResultPath)) {
          const stats = statSync(analysisResultPath)
          // File exists and hasn't changed in size (analysis complete)
          if (stats.size > 0 && stats.size === lastFileSize) {
            logger.info(`Analysis file detected as complete: ${analysisResultPath}`)
            const content = readFileSync(analysisResultPath, 'utf-8')
            const result = JSON.parse(content) as Analysis
            cleanup()
            if (!resolved) {
              resolved = true
              resolve(parseAnalysisResult(result))
            }
            return true
          }
          lastFileSize = stats.size
        }
      } catch (error) {
        // File doesn't exist yet or JSON parsing failed, keep waiting
        logger.debug(`Analysis file check: ${error}`)
      }
      return false
    }

    const cleanup = () => {
      if (fileCheckInterval) {
        clearInterval(fileCheckInterval)
        fileCheckInterval = null
      }
    }

    // Start periodic file check as fallback
    fileCheckInterval = setInterval(checkFileComplete, FILE_CHECK_INTERVAL_MS)

    // Overall timeout
    const timeout = setTimeout(() => {
      cleanup()
      if (!resolved) {
        // Last check before giving up
        if (checkFileComplete()) return
        resolved = true
        reject(new Error(`Analysis timeout after ${ANALYSIS_TIMEOUT_MS / 1000}s`))
      }
    }, ANALYSIS_TIMEOUT_MS)

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
        clearTimeout(timeout)
        cleanup()
        if (!resolved) {
          resolved = true
          resolve(parseAnalysisResult(result))
        }
      },
      (error) => {
        clearTimeout(timeout)
        cleanup()
        // Before rejecting, check if file was actually created
        if (checkFileComplete()) return
        if (!resolved) {
          resolved = true
          logger.error('❌ ERROR CALLBACK EXECUTED: ' + error)
          reject(error)
        }
      }
    )
  })
}
