import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import { logger } from '@shared/services/logger'
import { requireUser } from '~/services/user.server'
import { createPathValidator } from '@shared/services/pathValidator'
import { MEDIA_BASE_PATH } from '@shared/constants'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')

  if (!source) {
    throw new Response('No file path provided', { status: 400 })
  }

  try {
    await requireUser(request)

    const pathValidator = createPathValidator(MEDIA_BASE_PATH)

    const decodedPath = decodeURIComponent(source)

    const validation = pathValidator.validatePath(decodedPath)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${path} - ${validation.error}`)
      throw new Response('Access denied', { status: 403 })
    }

    if (!fs.existsSync(decodedPath)) {
      return new Response('Video File not found', { status: 404 })
    }

    const stats = fs.statSync(decodedPath)

    const contentType = getContentType(decodedPath)

    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
      const chunkSize = end - start + 1

      if (chunkSize >= 0 && start >= 0 && chunkSize <= 100 * 1024 * 1024) {
        const buffer = Buffer.alloc(chunkSize)
        const fd = fs.openSync(decodedPath, 'r')
        const uint8Array = new Uint8Array(buffer)

        fs.readSync(fd, uint8Array, 0, chunkSize, start)
        fs.closeSync(fd)

        return new Response(uint8Array, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          },
        })
      }
    }

    const stream = fs.createReadStream(decodedPath)

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    logger.warn(error)
    throw new Response('Error loading media', { status: 404 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
  }
  return contentTypes[ext] || 'application/octet-stream'
}
