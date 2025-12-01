import { chmod } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { logger } from '../services/logger'

let ffmpegPath: string | null = null
let ffprobePath: string | null = null

const loadFFmpegPath = async (): Promise<string> => {
  if (ffmpegPath) return ffmpegPath
  
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
  if (!ffmpegInstaller.path) {
    throw new Error('FFmpeg binary not found.')
  }
  
  ffmpegPath = ffmpegInstaller.path
  return ffmpegPath
}

const loadFFprobePath = async (): Promise<string> => {
  if (ffprobePath) return ffprobePath
  
  const ffprobeInstaller = await import('@ffprobe-installer/ffprobe')
  if (!ffprobeInstaller.path) {
    throw new Error('FFprobe binary not found.')
  }
  
  ffprobePath = ffprobeInstaller.path
  return ffprobePath
}

const ensureBinaryPermissions = async (binaryPath: string): Promise<void> => {
  try {
    if (existsSync(binaryPath)) {
      await chmod(binaryPath, 0o755)
    }
  } catch (error) {
    logger.warn(`Failed to set permissions for ${binaryPath}:` + error)
  }
}

const validateBinary = async (binaryPath: string, name: string): Promise<void> => {
  await ensureBinaryPermissions(binaryPath)
  
  if (!existsSync(binaryPath)) {
    throw new Error(`${name} binary not found at path: ${binaryPath}`)
  }
}

export const validateBinaries = async (): Promise<void> => {
  const [ffmpeg, ffprobe] = await Promise.all([
    loadFFmpegPath(),
    loadFFprobePath()
  ])
  
  await Promise.all([
    validateBinary(ffmpeg, 'FFmpeg'),
    validateBinary(ffprobe, 'FFprobe')
  ])
}

export const spawnFFmpeg = async (args: string[]): Promise<ChildProcess> => {
  const path = await loadFFmpegPath()
  await validateBinary(path, 'FFmpeg')
  return spawn(path, args)
}

export const spawnFFprobe = async (args: string[]): Promise<ChildProcess> => {
  const path = await loadFFprobePath()
  await validateBinary(path, 'FFprobe')
  return spawn(path, args)
}