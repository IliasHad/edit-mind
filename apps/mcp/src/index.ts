import { Server } from '@modelcontextprotocol/sdk/server/index'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types'
import { apiFetch } from './config'
import * as Videos from './tools/videos'
import * as Search from './tools/search'
import * as Collections from './tools/collections'
import * as Suggestions from './tools/suggestions'
import * as Media from './tools/media'

const server = new Server(
  { name: 'edit-mind', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    Search.definition,
    Media.definition,
    Videos.listDefinition,
    Videos.getDefinition,
    Collections.listDefinition,
    Collections.getDefinition,
    Suggestions.definition,
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const a = (args ?? {}) as Record<string, unknown>

  switch (name) {
    case 'search_video_scenes':  return Search.handle(a, apiFetch)
    case 'view_media':           return Media.handle(a, apiFetch)
    case 'list_videos':          return Videos.handleList(a, apiFetch)
    case 'get_video':            return Videos.handleGet(a, apiFetch)
    case 'list_collections':     return Collections.handleList(a, apiFetch)
    case 'get_collection':       return Collections.handleGet(a, apiFetch)
    case 'get_suggestions':      return Suggestions.handle(a, apiFetch)
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`)
  process.exit(1)
})
