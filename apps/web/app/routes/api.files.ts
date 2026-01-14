import pathModule from 'path'
import fs from 'fs/promises'
import { MEDIA_BASE_PATH } from '@shared/constants'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@media-utils/constants'
import { logger } from '@shared/services/logger'
import { createPathValidator } from '@shared/services/pathValidator'

const pathValidator = createPathValidator(MEDIA_BASE_PATH)

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || '/'

  try {
    const validation = pathValidator.validatePath(path)

    if (!validation.isValid) {
      logger.warn(`Path validation failed: ${path} - ${validation.error}`)
      return { error: validation.error || 'Access denied' }
    }

    const fullPath = pathValidator.getRelativePath(validation.sanitizedPath)

    if (!fullPath) {
      logger.warn(`Path validation failed: ${fullPath}`)
      return { error: validation.error || 'Access denied' }
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    let folders = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            const entryFullPath = pathModule.join(fullPath, entry.name)

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

    let files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name))
        .map(async (entry) => {
          try {
            const entryFullPath = pathModule.join(fullPath, entry.name)

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
              isDirectory: false,
              mtime: stats.mtime.getTime(),
            }
          } catch (error) {
            logger.warn({ error }, `Skipping unreadable directory: ${entry.name}`)
            return null
          }
        })
    )

    folders = folders.filter((f) => f !== null)
    files = files.filter((f) => f !== null)

    return {
      folders: {
        ...folders,
        ...files
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read directory')
    return { error: 'Failed to read directory' }
  }
}
