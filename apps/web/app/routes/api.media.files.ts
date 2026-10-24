import type { LoaderFunctionArgs } from 'react-router'
import pathModule from 'path'
import fs from 'fs/promises'
import { MEDIA_BASE_PATH, MEDIA_VISIBLE_FOLDERS } from '@shared/constants'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants/video'
import { logger } from '@shared/services/logger'
import { createPathValidator } from '@shared/services/pathValidator'
import { requireUser } from '~/services/user.server'

const pathValidator = createPathValidator(MEDIA_BASE_PATH, {
  allowedTopLevelFolders: MEDIA_VISIBLE_FOLDERS,
})

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireUser(request)
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(request.url)
  const path = url.searchParams.get('path') || '/'
  const sort = url.searchParams.get('sort') || 'recent'
  const search = url.searchParams.get('search')?.toLowerCase() || ''

  try {
    const validation = pathValidator.validatePath(path)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${path} - ${validation.error}`)
      return new Response(JSON.stringify({ error: validation.error || 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const fullPath = pathValidator.getRelativePath(validation.sanitizedPath)

    if (!fullPath) {
      logger.warn(`Path validation failed: ${fullPath}`)
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // A lexical validation is not sufficient for a directory that might itself
    // be a symlink. Resolve it before reading so a permitted-looking path cannot
    // enumerate a directory outside the media root.
    const realFullPath = await fs.realpath(fullPath)
    const realPathValidation = pathValidator.validatePath(realFullPath)

    if (!realPathValidation.isValid) {
      logger.warn(`Symlink resolves outside media root: ${realFullPath}`)
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const entries = await fs.readdir(realPathValidation.sanitizedPath, { withFileTypes: true })

    let files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name))
        .map(async (entry) => {
          try {
            const entryFullPath = pathModule.join(realPathValidation.sanitizedPath, entry.name)
            const entryValidation = pathValidator.validatePath(entryFullPath)

            if (!entryValidation.isValid) {
              logger.warn(`Skipping invalid file: ${entry.name}`)
              return null
            }

            const stats = await fs.stat(entryValidation.sanitizedPath)
            const relativePath = pathValidator.getRelativePath(entryValidation.sanitizedPath)

            return {
              path: relativePath,
              name: entry.name,
              isDirectory: false,
              mtime: stats.mtime.getTime(),
            }
          } catch (error) {
            logger.warn({ error }, `Skipping unreadable file: ${entry.name}`)
            return null
          }
        })
    )

    files = files.filter(Boolean)

    if (search) {
      files = files.filter((f) => f?.name.toLowerCase().includes(search))
    }

    if (sort === 'recent') {
      files.sort((a, b) => (b?.mtime || 0) - (a?.mtime || 0))
    } else if (sort === 'older') {
      files.sort((a, b) => (a?.mtime || 0) - (b?.mtime || 0))
    }

    return { files }
  } catch (error) {
    logger.error({ error }, 'Failed to read directory')
    return { error: 'Failed to read directory' }
  }
}
