import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireUser } from '~/services/user.server'
import { createPathValidator } from '@shared/services/pathValidator'
import { THUMBNAILS_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { getContentType } from '~/features/shared/utils/contentType'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    await requireUser(request)
  } catch {
    throw new Response('Unauthorized', { status: 401 })
  }

  try {
    const pathValidator = createPathValidator(THUMBNAILS_DIR)

    const decodedPath = path.normalize(decodeURIComponent(filePath))

    const validation = pathValidator.validatePath(decodedPath)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${decodedPath} - ${validation.error}`)
      throw new Response('Access denied', { status: 403 })
    }

    // Resolve symlinks and make sure the target still lives inside the thumbnails root
    let realPath = validation.sanitizedPath
    try {
      realPath = fs.realpathSync(realPath)
    } catch {
      throw new Response('File not found', { status: 404 })
    }

    const realpathValidation = pathValidator.validatePath(realPath)
    if (!realpathValidation.isValid) {
      logger.warn(`Symlink resolves outside thumbnails root: ${realPath}`)
      throw new Response('Access denied', { status: 403 })
    }

    if (!fs.existsSync(realPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(realPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const contentType = getContentType(realPath)

    const etag = generateEtag(realPath, stats)

    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 })
    }

    const stream = fs.createReadStream(realPath)

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${60 * 60 * 24 * 30}, immutable`, // 30 days
        ETag: etag,
      },
    })
  } catch (error) {
    // Propagate thrown responses (401/403/404) as-is; only wrap unexpected failures
    if (error instanceof Response) throw error
    logger.warn(error)
    throw new Response('File not found', { status: 404 })
  }
}

function generateEtag(filePath: string, stats: fs.Stats): string {
  const hash = crypto.createHash('md5')
  hash.update(`${filePath}-${stats.size}-${stats.mtimeMs}`)
  return `"${hash.digest('hex')}"`
}

