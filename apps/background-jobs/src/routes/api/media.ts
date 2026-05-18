import { Router, Request, Response } from 'express'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { logger } from '@shared/services/logger'
import { createPathValidator } from '@shared/services/pathValidator'
import { MEDIA_BASE_PATH, THUMBNAILS_DIR } from '@shared/constants'
import { requireScopes } from '@background-jobs/middleware/accessTokenAuth'

const router = Router()

const THUMBNAILS_BASE = path.isAbsolute(THUMBNAILS_DIR)
  ? THUMBNAILS_DIR
  : path.join(MEDIA_BASE_PATH, THUMBNAILS_DIR)

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

router.get('/', requireScopes('media_read'), async (req: Request, res: Response) => {
  const rawSource = req.query.source
  const source = typeof rawSource === 'string' ? rawSource : undefined

  if (!source) {
    res.status(400).json({ error: 'Missing source query parameter' })
    return
  }

  const decodedPath = decodeURIComponent(source)

  const mediaValidator = createPathValidator(MEDIA_BASE_PATH)
  const thumbValidator = createPathValidator(THUMBNAILS_BASE)

  const validation = mediaValidator.validatePath(decodedPath).isValid
    ? mediaValidator.validatePath(decodedPath)
    : thumbValidator.validatePath(decodedPath)

  if (!validation.isValid) {
    logger.warn(`Media path validation failed: ${decodedPath} — ${validation.error}`)
    res.status(403).json({ error: 'Access denied' })
    return
  }

  const safePath = validation.sanitizedPath

  let stat: fs.Stats
  try {
    stat = await fsPromises.stat(safePath)
  } catch {
    res.status(404).json({ error: 'File not found' })
    return
  }

  const ext = path.extname(safePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = Math.min(parts[1] ? parseInt(parts[1], 10) : fileSize - 1, fileSize - 1)

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
      res.end()
      return
    }

    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })

    fs.createReadStream(safePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })

    fs.createReadStream(safePath).pipe(res)
  }
})

export default router
