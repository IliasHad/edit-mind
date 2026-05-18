import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types'
import type { Tool } from '@modelcontextprotocol/sdk/types'
import type { Fetcher } from '../types'

export const definition: Tool = {
  name: 'get_suggestions',
  description:
    'Get search suggestions for a query prefix. Useful for discovering what content is in the library before running a full search.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Partial query to get suggestions for (minimum 2 characters). Omit to get popular searches.',
      },
    },
    required: [],
  },
}

export async function handle(args: Record<string, unknown>, fetch: Fetcher) {
  const { query } = args as { query?: string }

  const q = query ? `?q=${encodeURIComponent(query)}` : ''
  const res = await fetch(`/api/v0/suggestions${q}`)

  if (!res.ok) {
    const text = await res.text()
    throw new McpError(ErrorCode.InternalError, `Failed to get suggestions (${res.status}): ${text}`)
  }

  interface Suggestion {
    text: string
    type: string
    count: number
    sceneCount: number
  }

  const data = (await res.json()) as { suggestions: Suggestion[] }

  if (data.suggestions.length === 0) {
    return {
      content: [{ type: 'text' as const, text: 'No suggestions found.' }],
    }
  }

  const byType = new Map<string, Suggestion[]>()
  for (const s of data.suggestions) {
    const list = byType.get(s.type) ?? []
    list.push(s)
    byType.set(s.type, list)
  }
  const text = Array.from(byType.entries())
    .map(([type, items]) => `**${type}**\n${items.map((s) => `  • ${s.text}`).join('\n')}`)
    .join('\n\n')

  const label = query ? `Suggestions for "${query}"` : 'Popular searches'
  return {
    content: [{ type: 'text' as const, text: `${label}:\n\n${text}` }],
  }
}
