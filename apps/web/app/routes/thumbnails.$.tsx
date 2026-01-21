import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireUser } from '~/services/user.sever'
import { createPathValidator } from '@shared/services/pathValidator'
import { THUMBNAILS_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    await requireUser(request)

    const pathValidator = createPathValidator(THUMBNAILS_DIR)

    const decodedPath = path.normalize(decodeURIComponent(filePath))

    const validation = pathValidator.validatePath(decodedPath)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${path} - ${validation.error}`)
      throw new Response('Access denied', { status: 403 })
    }

    if (!fs.existsSync(decodedPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(decodedPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const contentType = getContentType(decodedPath)

    const etag = generateEtag(decodedPath, stats)

    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 })
    }

    const stream = fs.createReadStream(decodedPath)

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${60 * 60 * 24 * 30}, immutable`, // 30 days
        ETag: etag,
      },
    })
  } catch {
    throw new Response('File not found', { status: 404 })
  }
}

function generateEtag(filePath: string, stats: fs.Stats): string {
  const hash = crypto.createHash('md5')
  hash.update(`${filePath}-${stats.size}-${stats.mtimeMs}`)
  return `"${hash.digest('hex')}"`
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }
  return types[ext] || 'application/octet-stream'
}
