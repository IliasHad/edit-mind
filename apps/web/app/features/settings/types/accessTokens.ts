// Mirror of the AccessTokenScope Prisma enum. Browser code can't import @prisma/client,
// so this must be kept in sync with packages/prisma/schema.prisma manually.
export type AccessTokenScope =
  | 'videos_read'
  | 'collections_read'
  | 'media_read'
  | 'folders_read'
  | 'jobs_read'
  | 'chats_write'
  | 'collections_write'
  | 'folders_write'
  | 'videos_write'

export interface AccessToken {
  id: string
  name: string
  description?: string | null
  scopes: AccessTokenScope[]
  expiresAt?: string | null
  lastUsedAt?: string | null
  lastUsedIp?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTokenInput {
  name: string
  description?: string
  scopes: AccessTokenScope[]
  expiresAt?: string | null
}

export const SCOPE_LABELS: Record<AccessTokenScope, { label: string; description: string }> = {
  videos_read: { label: 'Videos (read)', description: 'List and search videos' },
  collections_read: { label: 'Collections (read)', description: 'List and read collections' },
  media_read: { label: 'Media (read)', description: 'Stream media files and thumbnails' },
  folders_read: { label: 'Folders (read)', description: 'List watched folders' },
  jobs_read: { label: 'Jobs (read)', description: 'Read indexing job status' },
  chats_write: { label: 'Chats (write)', description: 'Create and send chat messages' },
  collections_write: { label: 'Collections (write)', description: 'Create and update collections' },
  folders_write: { label: 'Folders (write)', description: 'Add and remove watched folders' },
  videos_write: { label: 'Videos (write)', description: 'Update video metadata' },
}

export const MCP_SCOPES: AccessTokenScope[] = ['videos_read', 'collections_read', 'media_read']
