import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { Fetcher, Video, Scene } from '../types'

export const listDefinition: Tool = {
  name: 'list_videos',
  description: 'List all videos in your Edit Mind library with their metadata and thumbnail URLs.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
}

export const getDefinition: Tool = {
  name: 'get_video',
  description:
    'Get full details for a single video including all its scenes with descriptions, detected faces, objects, emotions, and scene thumbnail URLs. Use view_media to display any thumbnailUrl.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Video ID from list_videos or search_video_scenes results',
      },
    },
    required: ['id'],
  },
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(1)
  return m > 0 ? `${m}:${s.padStart(4, '0')}` : `0:${s.padStart(4, '0')}`
}

function formatSceneFull(scene: Scene, index: number): string {
  const lines: string[] = [
    `Scene ${index + 1} [${formatTime(scene.startTime)} – ${formatTime(scene.endTime)}]${scene.shotType ? ` · ${scene.shotType}` : ''}`,
    `  ${scene.description}`,
  ]
  if (scene.transcription)    lines.push(`  Transcript: "${scene.transcription}"`)
  if (scene.faces.length)     lines.push(`  Faces: ${scene.faces.join(', ')}`)
  if (scene.emotions.length)  lines.push(`  Emotions: ${scene.emotions.map((e) => `${e.name}: ${e.emotion}`).join(', ')}`)
  if (scene.objects.length)   lines.push(`  Objects: ${scene.objects.join(', ')}`)
  if (scene.detectedText.length) lines.push(`  Text: ${scene.detectedText.join(', ')}`)
  if (scene.dominantColorName) lines.push(`  Color: ${scene.dominantColorName}`)
  if (scene.camera)           lines.push(`  Camera: ${scene.camera}`)
  if (scene.thumbnailUrl)     lines.push(`  Thumbnail: ${scene.thumbnailUrl}`)
  return lines.join('\n')
}

export async function handleList(_args: Record<string, unknown>, fetch: Fetcher) {
  const res = await fetch('/api/v0/videos')

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to list videos (${res.status}): ${text}`)
  }

  const { videos, total } = (await res.json()) as { videos: Video[]; total: number }

  if (videos.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No videos in your library yet.' }],
    }
  }

  const lines = videos.map((v, i) => {
    const parts = [
      `${i + 1}. **${v.name}** (ID: ${v.id})`,
      `   Duration: ${v.duration}s · ${v.aspectRatio ?? 'unknown ratio'}`,
      v.location ? `   Location: ${v.location}` : null,
      v.thumbnailUrl ? `   Thumbnail: ${v.thumbnailUrl}` : null,
      `   Imported: ${new Date(v.importAt).toLocaleDateString()}`,
    ].filter(Boolean)
    return parts.join('\n')
  })

  const shown = videos.length < total ? `${videos.length} of ${total}` : `${total}`
  const heading = `${shown} video${total !== 1 ? 's' : ''} in your library:`

  return {
    content: [
      {
        type: 'text' as const,
        text: `${heading}\n\n${lines.join('\n\n')}`,
      },
    ],
  }
}

export async function handleGet(args: Record<string, unknown>, fetch: Fetcher) {
  const { id } = args as { id?: string }

  if (!id) {
    throw new McpError(ErrorCode.InvalidParams, 'id is required')
  }

  const res = await fetch(`/api/v0/videos/${encodeURIComponent(id)}`)

  if (res.status === 404) {
    return {
      content: [{ type: 'text' as const, text: `Video not found: ${id}` }],
      isError: true,
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to get video (${res.status}): ${text}`)
  }

  const { video, scenes } = (await res.json()) as { video: Video; scenes: Scene[] }

  const header = [
    `**${video.name}**`,
    `Duration: ${video.duration}s · Aspect ratio: ${video.aspectRatio ?? 'unknown'}`,
    video.location ? `Location: ${video.location}` : null,
    video.thumbnailUrl ? `Video thumbnail: ${video.thumbnailUrl}` : null,
    `ID: ${video.id}`,
    `Source: ${video.source}`,
    `Imported: ${new Date(video.importAt).toLocaleDateString()}`,
    '',
    `── ${scenes.length} scene${scenes.length !== 1 ? 's' : ''} ──`,
  ].filter(Boolean).join('\n')

  const sceneText = scenes.length > 0
    ? scenes.map((s, i) => formatSceneFull(s, i)).join('\n\n')
    : 'No scenes indexed yet.'

  return {
    content: [{ type: 'text' as const, text: `${header}\n\n${sceneText}` }],
  }
}
