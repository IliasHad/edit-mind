import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import { logger } from '@shared/services/logger'
import { requireUser } from '~/services/user.server'
import { createPathValidator } from '@shared/services/pathValidator'
import { MEDIA_BASE_PATH, MEDIA_VISIBLE_FOLDERS } from '@shared/constants'
import { getContentType } from '~/features/shared/utils/contentType'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')

  if (!source) {
    throw new Response('No file path provided', { status: 400 })
  }

  try {
    await requireUser(request)
  } catch {
    throw new Response('Unauthorized', { status: 401 })
  }

  try {
    const pathValidator = createPathValidator(MEDIA_BASE_PATH, {
      allowedTopLevelFolders: MEDIA_VISIBLE_FOLDERS,
    })

    const decodedPath = decodeURIComponent(source)

    const validation = pathValidator.validatePath(decodedPath)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${decodedPath} - ${validation.error}`)
      throw new Response('Access denied', { status: 403 })
    }

    // Resolve symlinks and make sure the target still lives inside the media root
    let realPath = validation.sanitizedPath
    try {
      realPath = fs.realpathSync(realPath)
    } catch {
      return new Response('Video File not found', { status: 404 })
    }

    const realpathValidation = pathValidator.validatePath(realPath)
    if (!realpathValidation.isValid) {
      logger.warn(`Symlink resolves outside media root: ${realPath}`)
      throw new Response('Access denied', { status: 403 })
    }

    if (!fs.existsSync(realPath)) {
      return new Response('Video File not found', { status: 404 })
    }

    const stats = fs.statSync(realPath)

    const contentType = getContentType(realPath)

    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const isWellFormedRange = /^\d+$/.test(parts[0]) && (parts[1] === '' || /^\d+$/.test(parts[1]))
      const start = isWellFormedRange ? parseInt(parts[0], 10) : -1
      const rawEnd = isWellFormedRange && parts[1] ? parseInt(parts[1], 10) : -1

      // Per RFC 7233: malformed or unsatisfiable (start past EOF) ranges get a
      // 416; an end value past EOF gets clamped to the last byte, not rejected.
      if (!isWellFormedRange || start >= stats.size || (parts[1] !== '' && rawEnd < start)) {
        return new Response('Range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${stats.size}` },
        })
      }

      const endByte = parts[1] ? Math.min(rawEnd, stats.size - 1) : stats.size - 1
      const chunkSize = endByte - start + 1

      if (chunkSize <= 100 * 1024 * 1024) {
        const buffer = Buffer.alloc(chunkSize)
        const fd = fs.openSync(realPath, 'r')
        const uint8Array = new Uint8Array(buffer)

        try {
          fs.readSync(fd, uint8Array, 0, chunkSize, start)
        } finally {
          fs.closeSync(fd)
        }

        return new Response(uint8Array, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${endByte}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
          },
        })
      }
    }

    const stream = fs.createReadStream(realPath)

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
    // Propagate thrown responses (401/403/404) as-is; only wrap unexpected failures
    if (error instanceof Response) throw error
    logger.warn(error)
    throw new Response('Error loading media', { status: 404 })
  }
}