import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*']

  if (!filePath) {
    throw new Response('No file path provided', { status: 400 })
  }

  try {
    const decodedPath = decodeURIComponent(filePath)

    if (!fs.existsSync(decodedPath)) {
      return new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(decodedPath)

    if (!stats.isFile()) {
      return new Response('Not a file', { status: 400 })
    }

    const contentType = getContentType(decodedPath)

    const range = request.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1
      const chunkSize = end - start + 1

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

    const fileBuffer = fs.readFileSync(decodedPath)
    const uint8Array = new Uint8Array(fileBuffer)

    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    throw new Response('File not found or error loading media', { status: 404 })
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
