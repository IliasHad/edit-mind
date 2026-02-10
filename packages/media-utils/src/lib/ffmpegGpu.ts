import { USE_FFMPEG_GPU } from '@media-utils/constants'
import { FFmpegGPUOptions } from '@media-utils/types/ffmpeg'
import { logger } from '@shared/services/logger'

export function getGPUDecodeArgs(options: FFmpegGPUOptions = {}): string[] {
  if (!USE_FFMPEG_GPU || !options.enableHWAccel) {
    return []
  }

  return ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']
}

export function getGPUEncoder(options: FFmpegGPUOptions = {}): { codec: string; extraArgs: string[] } {
  if (!USE_FFMPEG_GPU) {
    // Return CPU encoders
    const codec = options.encoder === 'hevc' ? 'libx265' : 'libx264'
    return {
      codec,
      extraArgs: ['-preset', options.preset || 'medium', '-crf', '23'],
    }
  }

  // Return GPU encoders
  const codec = options.encoder === 'hevc' ? 'hevc_nvenc' : 'h264_nvenc'
  const nvencPreset = options.preset || 'p4' // p4 = balanced

  return {
    codec,
    extraArgs: ['-preset', nvencPreset, '-rc', 'vbr', '-cq', '23'],
  }
}

export function getScaleFilter(width: number, height: number, options: FFmpegGPUOptions = {}): string {
  if (USE_FFMPEG_GPU && options.useGPUScaling) {
    // GPU-accelerated scaling (CUDA)
    return `scale_cuda=${width}:${height}`
  }

  // CPU scaling (works everywhere)
  return `scale=${width}:${height}`
}

export function buildEncodingArgs(options: FFmpegGPUOptions = {}): string[] {
  const encoder = getGPUEncoder(options)

  const args = [
    '-c:v', encoder.codec, 
    ...encoder.extraArgs,  
    '-c:a', 'aac',
    '-b:a', '128k',
    '-pix_fmt', 'yuv420p'
  ]

  if (USE_FFMPEG_GPU) {
    logger.debug(`Using GPU encoder: ${encoder.codec}`)
  } else {
    logger.debug(`Using CPU encoder: ${encoder.codec}`)
  }

  return args
}
