# Edit Mind API

Base path: `/api/v0`

All endpoints require a Bearer access token obtained from the Edit Mind settings page.

---

## Authentication

Include the token in every request:

```
Authorization: Bearer <your-access-token>
```

Access tokens carry scopes that limit which endpoints they can call:

| Scope | Grants access to |
|---|---|
| `videos_read` | List videos, search, suggestions |
| `collections_read` | List and read collections |
| `media_read` | Serve media files |

Tokens can optionally have an expiry date and an IP allowlist.

### Error responses

| Status | Meaning |
|---|---|
| `401 Unauthorized` | Token missing, invalid, or expired |
| `403 Forbidden` | Token valid but lacks the required scope, or IP not allowed |

---

## Videos

### List videos

```
GET /api/v0/videos
```

**Required scope:** `videos_read`

Returns videos belonging to the authenticated user, newest first. Supports pagination.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `limit` | number | Results per page, 1–100, default `30` |
| `offset` | number | Pagination offset, default `0` |

**Response**

```json
{
  "videos": [
    {
      "id": "abc123",
      "name": "sunset-timelapse.mp4",
      "source": "/media/videos/sunset-timelapse.mp4",
      "thumbnailUrl": "/media/videos/.thumbnails/sunset-timelapse.jpg",
      "duration": 142,
      "aspectRatio": "16:9",
      "location": "Santorini",
      "faces": ["Alice", "Bob"],
      "emotions": [{"emotion": "happy", "confidence": 0.9}],
      "shotTypes": ["wide-shot", "close-up"],
      "objects": ["sunset", "sea"],
      "importAt": "2024-11-01T10:00:00Z",
      "updatedAt": "2024-11-01T10:05:00Z"
    }
  ],
  "total": 142,
  "limit": 30,
  "offset": 0,
  "hasMore": true,
  "totalPages": 5
}
```

---

### Get video details + scenes

```
GET /api/v0/videos/:id
```

**Required scope:** `videos_read`

Returns full video metadata together with its indexed scenes from the vector database.

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Video ID |

**Response**

```json
{
  "video": { "id": "abc123", "name": "...", "..." : "..." },
  "scenes": [
    {
      "id": "scene-xyz",
      "source": "/media/videos/sunset.mp4",
      "startTime": 0,
      "endTime": 8.5,
      "transcription": "The sun dips below the horizon...",
      "faces": ["Alice"],
      "objects": ["sunset", "clouds"],
      "shotType": "wide-shot",
      "camera": "Sony A7IV"
    }
  ]
}
```

Returns `404` if the video does not exist or belongs to another user.

---

## Search

### Search videos

```
POST /api/v0/search
```

**Required scope:** `videos_read`

Filters videos by metadata fields. All filters are optional and combined with AND logic.

**Request body**

```json
{
  "query": "beach",
  "location": "Malibu",
  "aspectRatio": "16:9",
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Description |
|---|---|---|
| `query` | string | Case-insensitive substring match on video name |
| `location` | string | Case-insensitive substring match on location |
| `aspectRatio` | string | Exact match (e.g. `"16:9"`, `"1:1"`, `"9:16"`) |
| `limit` | number | Results per page, 1–100, default `30` |
| `offset` | number | Pagination offset, default `0` |

**Response**

```json
{
  "videos": [...],
  "total": 47,
  "limit": 20,
  "offset": 0,
  "hasMore": true,
  "totalPages": 3
}
```

---

## Suggestions

### Get search suggestions

```
GET /api/v0/suggestions?q=<query>
```

**Required scope:** `videos_read`

Returns autocomplete suggestions derived from indexed scene metadata (faces, objects, emotions, locations, etc.).

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Prefix to complete. 2–100 characters. If absent or too short, returns popular suggestions. |

**Response**

```json
{
  "suggestions": [
    { "text": "Alice", "type": "face", "count": 1, "sceneCount": 1 },
    { "text": "sunset", "type": "object", "count": 1, "sceneCount": 1 }
  ]
}
```

Returns up to 50 suggestions scoped to the authenticated user's library. Suggestion types: `face`, `object`, `emotion`, `location`, `person`.

**Errors**

| Status | Cause |
|---|---|
| `400` | `q` exceeds 100 characters |

---

## Media

### Serve a media file

```
GET /api/v0/media?source=<path>
```

**Required scope:** `media_read`

Streams a media file (video or image) from the server. Supports HTTP range requests for video seeking.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `source` | string | URL-encoded absolute path to the file on the server (e.g. `/media/videos/clip.mp4`) |

**Response headers**

```
Content-Type: video/mp4
Content-Length: 10485760
Accept-Ranges: bytes
```

For range requests (`Range: bytes=0-1023`), the server responds with `206 Partial Content`.

**Errors**

| Status | Cause |
|---|---|
| `400` | `source` parameter missing |
| `403` | Path is outside the allowed media directory |
| `404` | File does not exist on disk |

---

## Collections

### List collections

```
GET /api/v0/collections
```

**Required scope:** `collections_read`

Returns collections belonging to the authenticated user. Supports filtering by type and pagination.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Filter by collection type. Use `all` (default) to return every type. |
| `limit` | number | Results per page, 1–100, default `30` |
| `offset` | number | Pagination offset, default `0` |

**Collection types**

`visual_style`, `subject_matter`, `emotional_tone`, `aspect_ratio`, `time_of_day`, `use_case`, `people`, `location`, `custom`, `geographic_location`, `person`, `b_roll`, `audio`

**Response**

```json
{
  "collections": [
    {
      "id": "col-abc",
      "name": "Best B-Roll",
      "type": "b_roll",
      "status": "active",
      "itemCount": 24,
      "totalDuration": 3600,
      "thumbnailUrl": "/media/videos/.thumbnails/broll-cover.jpg",
      "createdAt": "2024-10-01T08:00:00Z"
    }
  ],
  "total": 18,
  "limit": 30,
  "offset": 0,
  "hasMore": false,
  "totalPages": 1
}
```

**Errors**

| Status | Cause |
|---|---|
| `400` | `type` is not a valid collection type |

---

### Get collection videos and scenes

```
GET /api/v0/collections/:id
```

**Required scope:** `collections_read`

Returns the collection metadata together with each item, its linked video, and the scene IDs matched to that collection.

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Collection ID |

**Response**

```json
{
  "collection": {
    "id": "col-abc",
    "name": "Best B-Roll",
    "type": "b_roll",
    "status": "active",
    "itemCount": 2
  },
  "items": [
    {
      "id": "item-1",
      "videoId": "vid-xyz",
      "sceneIds": ["scene-1", "scene-2"],
      "confidence": 0.93,
      "matchType": "embedding",
      "isPinned": false,
      "video": {
        "id": "vid-xyz",
        "name": "drone-coastline.mp4",
        "thumbnailUrl": "/media/videos/.thumbnails/drone.jpg",
        "duration": 87,
        "aspectRatio": "16:9"
      }
    }
  ]
}
```

Returns `404` if the collection does not exist or belongs to another user.
