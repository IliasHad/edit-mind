import pathModule from 'path'
import fs from 'fs/promises'
import { MEDIA_BASE_PATH } from '@shared/constants'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@media-utils/constants'

import { logger } from '@shared/services/logger'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || MEDIA_BASE_PATH

  let filePath = path

  if (path === '/') {
    filePath = MEDIA_BASE_PATH
  }

  try {
    const fullPath = pathModule.resolve(filePath)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        path: pathModule.join(fullPath, entry.name),
        name: entry.name,
        isDirectory: true,
      }))

    const videos = entries
      .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name))
      .map((entry) => ({
        path: pathModule.join(fullPath, entry.name),
        name: entry.name,
        isDirectory: false,
      }))

    return { folders: [...folders, ...videos] }
  } catch (error) {
    logger.error(error)
    return { error: 'Failed to read directory' }
  }
}
