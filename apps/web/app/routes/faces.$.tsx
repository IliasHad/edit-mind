import type { LoaderFunctionArgs } from 'react-router';
import fs from 'fs';
import path from 'path'
import { FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { requireUser } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*']
  if (!filePath) {
    throw new Response('No file path provided', { status: 400 })
  }

  const decodedPath = path.join(FACES_DIR, decodeURIComponent(filePath))

  try {
    await requireUser(request)

    const stats = await fs.promises.stat(decodedPath)

    if (!stats.isFile()) {
      throw new Response('Not a file', { status: 400 })
    }

    const contentType = getContentType(decodedPath)
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
    logger.error(error)
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return types[ext] ?? 'application/octet-stream'
}