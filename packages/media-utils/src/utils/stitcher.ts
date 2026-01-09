import { ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { ExportedScene } from '@shared/types/scene'
import { Dimensions, FFmpegProcessResult } from '@shared/types/video'
import { spawnFFmpeg, validateBinaries } from '../lib/ffmpeg'
import os from 'os'
import { cleanupFiles, ensureDirectoryExists } from '@shared/utils/file'
import { logger } from '@shared/services/logger'
import { STITCHED_VIDEOS_DIR } from '../constants'

const DEFAULT_ASPECT_RATIO = '16:9'
const DEFAULT_FPS = 30
const DEFAULT_OUTPUT_DIR = 'output-videos'
const STANDARD_DIMENSION = 1080

const ENCODING_SETTINGS = {
  videoCodec: 'libx264',
  preset: 'medium',
  crf: '23',
  audioCodec: 'aac',
  audioBitrate: '128k',
  audioSampleRate: '48000',
  audioChannels: '2',
  pixelFormat: 'yuv420p',
} as const

const validateScenes = (scenes: ExportedScene[]) => {
  if (scenes.length === 0) {
    throw new Error('At least one scene is required for stitching')
  }

  scenes
    .map((scene, index) => {
      if (!scene.source) {
        throw new Error(`Scene ${index}: source path is required`)
      }
      if (!fs.existsSync(scene.source)) {
        throw new Error(`Scene ${index}: source file not found: ${scene.source}`)
      }
      if (scene.startTime < 0 || scene.endTime <= scene.startTime) {
        logger.debug(`Scene ${index}: invalid time range (${scene.startTime}s - ${scene.endTime}s)`)
        return null
      }
      return scene
    })
    .filter((scene) => scene !== null)
  return scenes
}

const validateOutputFileName = (fileName: string): void => {
  if (!fileName || !fileName.endsWith('.mp4')) {
    throw new Error('Output file name must be a valid .mp4 file')
  }
}

const parseAspectRatio = (aspectRatio: string): { numerator: number; denominator: number } => {
  const parts = aspectRatio.split(':').map(Number)
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new Error(`Invalid aspect ratio format: ${aspectRatio}. Expected format: "16:9"`)
  }
  return { numerator: parts[0], denominator: parts[1] }
}

const parseResolution = (resolution: string): Dimensions | null => {
  const parts = resolution.split('x').map(Number)
  if (parts.length === 2 && parts.every((n) => n > 0)) {
    return { width: parts[0], height: parts[1] }
  }
  return null
}

const calculateTargetDimensions = (aspectRatio: string, targetResolution?: string): Dimensions => {
  const parsedResolution = targetResolution ? parseResolution(targetResolution) : null

  if (parsedResolution) {
    return ensureEvenDimensions(parsedResolution)
  }

  const { numerator, denominator } = parseAspectRatio(aspectRatio)
  const aspectValue = numerator / denominator

  let width: number
  let height: number

  if (aspectValue >= 1) {
    // Landscape (e.g., 16:9)
    height = STANDARD_DIMENSION
    width = Math.round(height * aspectValue)
  } else {
    // Portrait (e.g., 9:16)
    width = STANDARD_DIMENSION
    height = Math.round(width * (denominator / numerator))
  }

  return ensureEvenDimensions({ width, height })
}

const ensureEvenDimensions = (dimensions: Dimensions): Dimensions => ({
  width: dimensions.width % 2 === 0 ? dimensions.width : dimensions.width + 1,
  height: dimensions.height % 2 === 0 ? dimensions.height : dimensions.height + 1,
})

const handleFFmpegProcess = (process: ChildProcess, operationName: string): Promise<FFmpegProcessResult> => {
  return new Promise((resolve, reject) => {
    let stderrOutput = ''

    process.stderr?.on('data', (data) => {
      const message = data.toString()
      stderrOutput += message
      logger.warn(`FFmpeg ${operationName} (warning): ${message}`)
    })

    process.on('close', (code) => {
      resolve({ code: code ?? -1, stderr: stderrOutput })
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg for ${operationName}: ${err.message}`))
    })
  })
}

const buildVideoFilter = (dimensions: Dimensions, fps: number): string => {
  return [
    `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease`,
    `pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2`,
    'setsar=1',
    `fps=${fps}`,
  ].join(',')
}

const buildEncodingArgs = (): string[] => {
  return [
    '-c:v',
    ENCODING_SETTINGS.videoCodec,
    '-preset',
    ENCODING_SETTINGS.preset,
    '-crf',
    ENCODING_SETTINGS.crf,
    '-c:a',
    ENCODING_SETTINGS.audioCodec,
    '-b:a',
    ENCODING_SETTINGS.audioBitrate,
    '-ar',
    ENCODING_SETTINGS.audioSampleRate,
    '-ac',
    ENCODING_SETTINGS.audioChannels,
    '-pix_fmt',
    ENCODING_SETTINGS.pixelFormat,
  ]
}

const processClip = async (
  scene: ExportedScene,
  clipPath: string,
  dimensions: Dimensions,
  targetFps: number
): Promise<void> => {
  const videoFilter = buildVideoFilter(dimensions, targetFps)
  const encodingArgs = buildEncodingArgs()

  const argsWithAudio = [
    '-ss',
    scene.startTime.toString(),
    '-to',
    scene.endTime.toString(),

    '-i',
    scene.source,

    '-vf',
    videoFilter,

    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',

    ...encodingArgs,

    '-y',
    clipPath,
  ]

  let process = await spawnFFmpeg(argsWithAudio)
  let result = await handleFFmpegProcess(process, `clip processing (${scene.source})`)

  if (result.code === 0) return

  logger.warn(`Initial processing failed for ${scene.source}, retrying with silent audio`)

  const argsWithSilentAudio = [
    '-ss',
    scene.startTime.toString(),
    '-to',
    scene.endTime.toString(),

    '-i',
    scene.source,

    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=48000:cl=stereo',

    '-vf',
    videoFilter,

    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-shortest',

    ...encodingArgs,

    '-y',
    clipPath,
  ]

  process = await spawnFFmpeg(argsWithSilentAudio)
  result = await handleFFmpegProcess(process, `clip processing retry (${scene.source})`)

  if (result.code !== 0) {
    throw new Error(`Failed to process clip from ${scene.source}: ${result.stderr || 'Unknown error'}`)
  }
}

const createFileList = (clipPaths: string[], fileListPath: string): void => {
  const content = clipPaths.map((clipPath) => `file '${clipPath}'`).join('\n')
  fs.writeFileSync(fileListPath, content, 'utf-8')
}

const concatenateClips = async (fileListPath: string, outputPath: string): Promise<void> => {
  const encodingArgs = buildEncodingArgs()

  const args = [
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    fileListPath,
    ...encodingArgs,
    '-y',
    outputPath,
    '-hide_banner',
    '-loglevel',
    'error',
  ]

  const process = await spawnFFmpeg(args)
  const result = await handleFFmpegProcess(process, 'concatenation')

  if (result.code !== 0 && (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0)) {
    throw new Error(`Failed to concatenate clips: ${result.stderr || 'Unknown error'}`)
  }
}

export async function stitchVideos(
  scenes: ExportedScene[],
  outputFileName: string,
  aspectRatio: string = DEFAULT_ASPECT_RATIO,
  targetFps: number = DEFAULT_FPS,
  targetResolution?: string
): Promise<string> {
  validateBinaries()
  const validatedScenes = validateScenes(scenes)
  validateOutputFileName(outputFileName)

  const outputDir = path.resolve(STITCHED_VIDEOS_DIR || DEFAULT_OUTPUT_DIR)
  ensureDirectoryExists(outputDir)

  const outputPath = path.join(outputDir, outputFileName)
  const fileListPath = path.join(os.tmpdir(), 'file-list.txt')
  const clipPaths: string[] = []

  const dimensions = calculateTargetDimensions(aspectRatio, targetResolution)

  try {
    for (let i = 0; i < validatedScenes.length; i++) {
      const scene = validatedScenes[i]
      const clipPath = path.join(os.tmpdir(), `clip_${i}_${Date.now()}.mp4`)
      clipPaths.push(clipPath)

      await processClip(scene, clipPath, dimensions, targetFps)
    }

    createFileList(clipPaths, fileListPath)

    await concatenateClips(fileListPath, outputPath)

    return outputPath
  } catch (error) {
    logger.error(`Error during video stitching: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  } finally {
    cleanupFiles([fileListPath, ...clipPaths])
  }
}
