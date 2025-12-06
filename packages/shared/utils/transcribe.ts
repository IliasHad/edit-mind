import { existsSync, statSync } from 'fs'
import { logger } from '../services/logger'
import { pythonService } from '../services/pythonService'
import { TranscriptionProgress } from '../types/transcription'

type ProgressCallback = (progress: TranscriptionProgress) => void

// Timeout for transcription based on video duration estimate
// Most videos transcribe at 10-30x realtime, so 4 hours should cover most cases
const TRANSCRIPTION_TIMEOUT_MS = 4 * 60 * 60 * 1000 // 4 hours
const FILE_CHECK_INTERVAL_MS = 30 * 1000 // Check every 30 seconds

export function transcribeAudio(
  videoPath: string,
  jsonFilePath: string,
  jobId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false
    let lastFileSize = 0
    let fileCheckInterval: NodeJS.Timeout | null = null

    // File-based completion check as fallback
    const checkFileComplete = () => {
      try {
        if (existsSync(jsonFilePath)) {
          const stats = statSync(jsonFilePath)
          // File exists and hasn't changed in size (transcription complete)
          if (stats.size > 0 && stats.size === lastFileSize) {
            logger.info(`Transcription file detected as complete: ${jsonFilePath}`)
            cleanup()
            if (!resolved) {
              resolved = true
              resolve()
            }
            return true
          }
          lastFileSize = stats.size
        }
      } catch (error) {
        // File doesn't exist yet, keep waiting
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
        reject(new Error(`Transcription timeout after ${TRANSCRIPTION_TIMEOUT_MS / 1000}s`))
      }
    }, TRANSCRIPTION_TIMEOUT_MS)

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
        clearTimeout(timeout)
        cleanup()
        if (!resolved) {
          resolved = true
          resolve(result)
        }
      },
      (error) => {
        clearTimeout(timeout)
        cleanup()
        // Before rejecting, check if file was actually created
        if (checkFileComplete()) return
        if (!resolved) {
          resolved = true
          reject(error)
        }
      }
    )
  })
}
