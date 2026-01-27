import type { LoaderFunctionArgs } from 'react-router'
import pathModule from 'path'
import fs from 'fs/promises'
import { MEDIA_BASE_PATH } from '@shared/constants'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@media-utils/constants'
import { logger } from '@shared/services/logger'
import { createPathValidator } from '@shared/services/pathValidator'

const pathValidator = createPathValidator(MEDIA_BASE_PATH)

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || '/'
  const sort = url.searchParams.get('sort') || 'recent'
  const search = url.searchParams.get('search')?.toLowerCase() || ''

  try {
    const validation = pathValidator.validatePath(path)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${path} - ${validation.error}`)
      return { error: validation.error || 'Access denied' }
    }

    const fullPath = pathValidator.getRelativePath(validation.sanitizedPath)

    if (!fullPath) {
      logger.warn(`Path validation failed: ${fullPath}`)
      return { error: 'Access denied' }
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    let files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name))
        .map(async (entry) => {
          try {
            const entryFullPath = pathModule.join(fullPath, entry.name)
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

    files = files.filter((f): f is NonNullable<typeof f> => f !== null)

    if (search) {
      files = files.filter((f) => f.name.toLowerCase().includes(search))
    }

    if (sort === 'recent') {
      files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
    } else if (sort === 'older') {
      files.sort((a, b) => (a.mtime || 0) - (b.mtime || 0))
    }

    return { files }
  } catch (error) {
    logger.error({ error }, 'Failed to read directory')
    return { error: 'Failed to read directory' }
  }
}
