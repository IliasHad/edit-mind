import type { LoaderFunctionArgs } from 'react-router'
import { createPathValidator } from '@shared/services/pathValidator'
import pathModule from 'path'
import fs from 'fs/promises'
import { logger } from '@shared/services/logger'
import { MEDIA_BASE_PATH, MEDIA_VISIBLE_FOLDERS } from '@shared/constants'
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
    const sort = url.searchParams.get('sort') || 'recent' // 'recent' or 'older'
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
            return new Response(JSON.stringify({ error: validation.error || 'Access denied' }), {
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

        let folders = await Promise.all(
            entries
                .filter((entry) => entry.isDirectory())
                .map(async (entry) => {
                    try {
                        const entryFullPath = pathModule.join(realPathValidation.sanitizedPath, entry.name)

                        // Validate each subdirectory path
                        const entryValidation = pathValidator.validatePath(entryFullPath)

                        if (!entryValidation.isValid) {
                            logger.warn(`Skipping invalid directory: ${entry.name}`)
                            return null
                        }

                        const stats = await fs.stat(entryValidation.sanitizedPath)

                        // Get relative path for response
                        const relativePath = pathValidator.getRelativePath(entryValidation.sanitizedPath)

                        return {
                            path: relativePath,
                            name: entry.name,
                            isDirectory: true,
                            mtime: stats.mtime.getTime(),
                        }
                    } catch (error) {
                        logger.warn({ error }, `Skipping unreadable directory: ${entry.name}`)
                        return null
                    }
                })
        )

        folders = folders.filter((f) => f !== null)

        if (search) {
            folders = folders.filter((f) => f && f.name.toLowerCase().includes(search))
        }

        if (sort === 'recent') {
            folders.sort((a, b) => (b?.mtime || 0) - (a?.mtime || 0))
        } else if (sort === 'older') {
            folders.sort((a, b) => (a?.mtime || 0) - (b?.mtime || 0))
        }

        return { folders }
    } catch (error) {
        logger.error({ error }, 'Failed to read directory')
        return { error: 'Failed to read directory' }
    }
}
