import { existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { FFmpegError } from '@media-utils/types/video'
import { FFMPEG_PATH, FFPROBE_PATH } from '@media-utils/constants'

const validateBinary = (binaryPath: string, name: string): void => {
  if (!existsSync(binaryPath)) {
    throw new Error(`${name} binary not found at path: ${binaryPath}`)
  }
}

export const validateBinaries = (): void => {
  validateBinary(FFMPEG_PATH, 'FFmpeg')
  validateBinary(FFPROBE_PATH, 'FFprobe')
}

export const spawnFFmpeg = (args: string[]): ChildProcess => {
  validateBinary(FFMPEG_PATH, 'FFmpeg')
  return spawn(FFMPEG_PATH, args)
}

export const spawnFFprobe = (args: string[]): ChildProcess => {
  validateBinary(FFPROBE_PATH, 'FFprobe')
  return spawn(FFPROBE_PATH, args)
}
export const handleFFmpegProcess = (process: ChildProcess, operationName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let errorOutput = ''

    process.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const error: FFmpegError = new Error(
          `FFmpeg ${operationName} failed with code ${code}: ${errorOutput.trim() || 'Unknown error'}`
        )
        error.code = code ?? undefined
        error.stderr = errorOutput
        reject(error)
      }
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg for ${operationName}: ${err.message}`))
    })
  })
}
