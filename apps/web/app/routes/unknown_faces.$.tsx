import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import { UNKNOWN_FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { requireUser } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    const decodedPath = decodeURIComponent(filePath)
    await requireUser(request)

    const safePath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
    const thumbnailPath = path.join(UNKNOWN_FACES_DIR, safePath)

    if (!fs.existsSync(thumbnailPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(thumbnailPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const contentType = getContentType(thumbnailPath)
    const stream = fs.createReadStream(thumbnailPath)

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
    logger.error(error)
    throw new Response(`File not found or error loading media: ${error}`, { status: 404 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.webm': 'video/webm',
  }
  return types[ext] || 'application/octet-stream'
}
