import { Router, Request, Response } from 'express'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import { logger } from '@shared/services/logger'
import { createPathValidator } from '@shared/services/pathValidator'
import { MEDIA_BASE_PATH } from '@shared/constants'
import { buildFfmpegArgs } from '@background-jobs/utils/transcoder'

const router = Router()

// One active FFmpeg process per source path
const activeProcesses = new Map<string, ChildProcess>()

function killExisting(key: string) {
  const existing = activeProcesses.get(key)
  if (existing) {
    existing.kill('SIGKILL')
    activeProcesses.delete(key)
  }
}

router.get('/transcode', async (req: Request, res: Response) => {
  const source = req.query.source as string | undefined
  const startSeconds = parseFloat(req.query.t as string || '0') || 0

  if (!source) return res.status(400).send('No source path provided')

  const pathValidator = createPathValidator(MEDIA_BASE_PATH)
  const decodedPath = decodeURIComponent(source)
  const validation = pathValidator.validatePath(decodedPath)

  if (!validation.isValid) {
    logger.warn(`Transcode path validation failed: ${decodedPath} — ${validation.error}`)
    return res.status(403).send('Access denied')
  }

  if (!fs.existsSync(decodedPath)) return res.status(404).send('Source file not found')

  // Kill any in-flight transcode for this file before starting a new one
  killExisting(decodedPath)

  logger.info(`Transcoding: ${decodedPath} from ${startSeconds}s`)

  const ffmpeg = spawn('ffmpeg', buildFfmpegArgs(decodedPath, startSeconds), {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  activeProcesses.set(decodedPath, ffmpeg)

  let ffmpegError = ''
  ffmpeg.stderr.on('data', (d: Buffer) => { ffmpegError += d.toString() })

  ffmpeg.on('error', (err) => {
    logger.error(`FFmpeg spawn error: ${err.message}`)
    activeProcesses.delete(decodedPath)
    if (!res.headersSent) res.status(500).send('Transcode failed')
  })

  ffmpeg.on('close', (code) => {
    activeProcesses.delete(decodedPath)
    if (code !== 0 && code !== null) {
      logger.error(`FFmpeg exited ${code}: ${ffmpegError.slice(-500)}`)
    }
  })

  res.on('close', () => {
    ffmpeg.kill('SIGKILL')
    activeProcesses.delete(decodedPath)
    logger.info(`Transcode stream closed for: ${decodedPath}`)
  })

  res.setHeader('Content-Type', 'video/mp4')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200)

  ffmpeg.stdout.pipe(res)
})

export default router