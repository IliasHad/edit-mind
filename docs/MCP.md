
## MCP Server (Claude integration)

Edit Mind ships an MCP server that exposes seven tools for use inside Claude Code or Claude Desktop.

### Installation

```jsonc
// .claude/settings.json  (project)  or  ~/.claude/settings.json  (global)
{
  "mcpServers": {
    "edit-mind": {
      "command": "node",
      "args": ["/path/to/edit-mind-api/apps/mcp/dist/index.js"],
      "env": {
        "EDIT_MIND_HOST": "http://localhost:4000",
        "EDIT_MIND_TOKEN": "your-access-token"
      }
    }
  }
}
```

For development (no build step):

```jsonc
{
  "mcpServers": {
    "edit-mind": {
      "command": "npx",
      "args": ["tsx", "/path/to/edit-mind-api/apps/mcp/src/index.ts"],
      "env": {
        "EDIT_MIND_HOST": "http://localhost:4000",
        "EDIT_MIND_TOKEN": "your-access-token"
      }
    }
  }
}
```

### Tools

#### `search_video_scenes`

Search the video library by name, location, or aspect ratio.

| Input | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Text matched against video names |
| `location` | string | No | Text matched against location field |
| `aspect_ratio` | string | No | Exact aspect ratio, e.g. `"16:9"` |
| `limit` | number | No | Max results, default 20 |

**Example Claude prompt**
> Search for all beach videos shot in vertical format

---

#### `list_videos`

List all videos in the library with their metadata and thumbnail URLs.

No inputs required.

**Example Claude prompt**
> Show me all videos in my library

---

#### `get_video`

Get full details for a single video including all its indexed scenes with descriptions, detected faces, objects, emotions, and scene thumbnail URLs.

| Input | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Video ID from `list_videos` or `search_video_scenes` results |

**Example Claude prompt**
> Give me all the scenes from the drone footage video

---

#### `list_collections`

List all AI-generated collections. Collections group videos by topic, location, people, or other criteria.

| Input | Type | Required | Description |
|---|---|---|---|
| `type` | string | No | Filter by type: `visual_style`, `subject_matter`, `emotional_tone`, `aspect_ratio`, `time_of_day`, `use_case`, `people`, `location`, `custom`, `geographic_location`, `person`, `b_roll`, `audio` |

**Example Claude prompt**
> What b-roll collections do I have?

---

#### `get_collection`

Get a collection with all its video items.

| Input | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Collection ID from `list_collections` results |

**Example Claude prompt**
> Show me everything in the "Golden Hour" collection

---

#### `get_suggestions`

Get search suggestions for a query prefix. Useful for discovering what content is indexed before running a full search.

| Input | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Partial query (min 2 characters). Omit to get popular searches. |

**Example Claude prompt**
> What faces are indexed in my library?

---

#### `view_media`

Fetch and display a media file inline. Pass a `thumbnailUrl` returned by any other tool to see a preview image.

| Input | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | Absolute server path to the file |

**Example Claude prompt**
> Show me the thumbnail for the first result
