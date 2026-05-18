import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { Fetcher } from '../types'

export const definition: Tool = {
  name: 'search_video_scenes',
  description:
    'Search your video library by name, location, or aspect ratio. Returns matching videos with their metadata, faces, objects, and thumbnail URLs. Use view_media to display any thumbnailUrl as an image.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Filter videos whose name contains this text (case-insensitive)',
      },
      location: {
        type: 'string',
        description: 'Filter by shooting location (e.g. "Paris", "beach")',
      },
      aspect_ratio: {
        type: 'string',
        description: 'Filter by aspect ratio (e.g. "16:9", "1:1", "9:16")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of videos to return (1–100, default 20)',
        minimum: 1,
        maximum: 100,
      },
    },
    required: [],
  },
}

interface SearchScene {
  id: string
  startTime: number
  endTime: number
  description: string
  thumbnailUrl?: string | null
  matched: boolean
}

interface SearchVideo {
  id: string
  name: string
  source: string
  thumbnailUrl: string | null
  duration: number
  location: string | null
  aspectRatio: string | null
  importAt: string
  faces: unknown
  objects: unknown
  emotions: unknown
  scenes: SearchScene[]
  sceneCount: number
}

function formatVideo(v: SearchVideo, index: number): string {
  const lines: string[] = [
    `${index + 1}. **${v.name}** (ID: ${v.id})`,
    `   Duration: ${v.duration}s · ${v.aspectRatio ?? 'unknown ratio'}`,
  ]
  if (v.location) lines.push(`   Location: ${v.location}`)
  if (v.thumbnailUrl) lines.push(`   Thumbnail: ${v.thumbnailUrl}`)
  if (Array.isArray(v.faces) && v.faces.length > 0)
    lines.push(`   Faces: ${(v.faces as string[]).join(', ')}`)
  if (Array.isArray(v.emotions) && v.emotions.length > 0)
    lines.push(
      `   Emotions: ${(v.emotions as Array<{ name: string; emotion: string }>)
        .map((e) => `${e.name}: ${e.emotion}`)
        .join(', ')}`
    )
  if (Array.isArray(v.objects) && v.objects.length > 0)
    lines.push(`   Objects: ${(v.objects as string[]).join(', ')}`)

  if (Array.isArray(v.scenes) && v.scenes.length > 0) {
    lines.push(`   Matched scenes (${v.scenes.length}):`)
    for (const scene of v.scenes) {
      const ts = `${scene.startTime.toFixed(1)}s–${scene.endTime.toFixed(1)}s`
      const thumb = scene.thumbnailUrl ? ` · Thumbnail: ${scene.thumbnailUrl}` : ''
      lines.push(`     • [${ts}] ${scene.description}${thumb}`)
    }
  }

  lines.push(`   Source: ${v.source}`)
  return lines.join('\n')
}

export async function handle(args: Record<string, unknown>, fetch: Fetcher) {
  const { query, location, aspect_ratio, limit = 20 } = args as {
    query?: string
    location?: string
    aspect_ratio?: string
    limit?: number
  }

  const res = await fetch('/api/v0/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      locations: location ? [location] : undefined,
      aspectRatio: aspect_ratio,
      limit,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Search failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as { videos: SearchVideo[]; total: number; limit: number }

  if (data.videos.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No videos found matching your search criteria.' }],
    }
  }

  const header = `Found ${data.total} video${data.total !== 1 ? 's' : ''}:\n\n`
  const body = data.videos.map((v, i) => formatVideo(v, i)).join('\n\n')

  return {
    content: [{ type: 'text' as const, text: header + body }],
  }
}
