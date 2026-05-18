import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { Fetcher } from '../types'

export const definition: Tool = {
  name: 'view_media',
  description:
    'Fetch and display a media file (image or video thumbnail) from the Edit Mind server. Pass a thumbnailUrl from search_video_scenes or get_video results to see the actual image.',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description:
          'Absolute path to the media file on the server (e.g. "/media/videos/.thumbnails/clip.jpg"). Use thumbnailUrl values from search or video results.',
      },
    },
    required: ['source'],
  },
}

export async function handle(args: Record<string, unknown>, fetch: Fetcher) {
  const { source } = args as { source?: string }

  if (!source) {
    throw new McpError(ErrorCode.InvalidParams, 'source is required')
  }

  const res = await fetch(`/api/v0/media?source=${encodeURIComponent(source)}`)

  if (res.status === 404) {
    return {
      content: [{ type: 'text' as const, text: `Media not found: ${source}` }],
      isError: true,
    }
  }

  if (res.status === 403) {
    return {
      content: [{ type: 'text' as const, text: `Access denied: ${source}` }],
      isError: true,
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to fetch media (${res.status}): ${text}`)
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'

  if (contentType.startsWith('image/')) {
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return {
      content: [
        { type: 'text' as const, text: `Media: ${source}` },
        { type: 'image' as const, data: base64, mimeType: contentType },
      ],
    }
  }

  const contentLength = res.headers.get('content-length')
  const size = contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : 'unknown size'

  return {
    content: [
      {
        type: 'text' as const,
        text: [
          `Video file: ${source}`,
          `Type: ${contentType} · Size: ${size}`,
          '',
          'This is a video file. Use a thumbnailUrl instead to see a preview image.',
        ].join('\n'),
      },
    ],
  }
}
