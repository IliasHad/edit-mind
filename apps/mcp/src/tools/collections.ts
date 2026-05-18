import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { Fetcher, Collection, CollectionItem } from '../types'

export const listDefinition: Tool = {
  name: 'list_collections',
  description:
    'List all AI-generated collections in your Edit Mind library. Collections group videos by topic, location, people, or other criteria.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description:
          'Filter by collection type. Valid values: visual_style, subject_matter, emotional_tone, aspect_ratio, time_of_day, use_case, people, location, custom, geographic_location, person, b_roll, audio. Omit to list all.',
      },
    },
    required: [],
  },
}

export const getDefinition: Tool = {
  name: 'get_collection',
  description: 'Get a collection with all its video items.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Collection ID from list_collections results',
      },
    },
    required: ['id'],
  },
}

export async function handleList(args: Record<string, unknown>, fetch: Fetcher) {
  const { type } = args as { type?: string }

  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  const res = await fetch(`/api/v0/collections${query}`)

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to list collections (${res.status}): ${text}`)
  }

  const { collections, total } = (await res.json()) as { collections: Collection[]; total: number }

  if (collections.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No collections found.' }],
    }
  }

  const lines = collections.map((c, i) => {
    return [
      `${i + 1}. **${c.name}** [${c.type}] (ID: ${c.id})`,
      c.description ? `   ${c.description}` : null,
    ].filter(Boolean).join('\n')
  })

  const shown = collections.length < total ? `${collections.length} of ${total}` : `${total}`
  const heading = `${shown} collection${total !== 1 ? 's' : ''}:`

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

  const res = await fetch(`/api/v0/collections/${encodeURIComponent(id)}`)

  if (res.status === 404) {
    return {
      content: [{ type: 'text' as const, text: `Collection not found: ${id}` }],
      isError: true,
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to get collection (${res.status}): ${text}`)
  }

  const { collection, items } = (await res.json()) as {
    collection: Collection
    items: CollectionItem[]
  }

  const header = [
    `**${collection.name}** [${collection.type}]`,
    collection.description ? collection.description : null,
    `ID: ${collection.id}`,
    `Created: ${new Date(collection.createdAt).toLocaleDateString()}`,
    '',
    `── ${items.length} video${items.length !== 1 ? 's' : ''} ──`,
  ].filter(Boolean).join('\n')

  const itemLines = items.map((item, i) => {
    if (item.video) {
      const v = item.video
      return [
        `${i + 1}. **${v.name}** (ID: ${v.id})`,
        `   Duration: ${v.duration}s · ${v.aspectRatio ?? 'unknown ratio'}`,
        v.thumbnailUrl ? `   Thumbnail: ${v.thumbnailUrl}` : null,
      ].filter(Boolean).join('\n')
    }
    return `${i + 1}. Video ID: ${item.videoId}`
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: `${header}\n\n${itemLines.length > 0 ? itemLines.join('\n\n') : 'No videos in this collection.'}`,
      },
    ],
  }
}
