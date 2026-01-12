import pathModule from 'path'
import fs from 'fs/promises'
import { MEDIA_BASE_PATH } from '@shared/constants'
import { getUser } from '~/services/user.sever'
import { logger } from '@shared/services/logger'
import { FolderModel } from '@db/index'

const IGNORED_DIRS = new Set(['.Spotlight-V100', '.fseventsd', '.Trashes', '.DS_Store'])

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || '/'
  const sort = url.searchParams.get('sort') || 'recent' // 'recent' or 'older'
  const search = url.searchParams.get('search')?.toLowerCase() || ''

  try {
    const fullPath = pathModule.resolve(MEDIA_BASE_PATH, path.replace(/^\//, ''))
    if (!fullPath.startsWith(pathModule.resolve(MEDIA_BASE_PATH))) {
      return { error: 'Access denied' }
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    let folders = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !IGNORED_DIRS.has(entry.name))
        .map(async (entry) => {
          try {
            const stats = await fs.stat(pathModule.join(fullPath, entry.name))

            return {
              path: pathModule.join(path, entry.name),
              name: entry.name,
              isDirectory: true,
              mtime: stats.mtime.getTime(),
            }
          } catch {
            // still keep this as a safety net
            logger.warn(`Skipping unreadable directory: ${entry.name}`)
            return null
          }
        })
    )

    if (search) {
      folders = folders.filter((f) => f && f.name.toLowerCase().includes(search)) ?? []
    }

    if (sort === 'recent') {
      folders.sort((a, b) => b.mtime - a.mtime)
    } else if (sort === 'older') {
      folders.sort((a, b) => a.mtime - b.mtime)
    }

    return { folders }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to read directory' }
  }
}

export async function action({ request }: { request: Request }) {
  try {
    const user = await getUser(request)
    const data = await request.json()
    const folderPath = data.path

    if (!user) {
      return { success: false, error: 'No user authenticated' }
    }

    if (!folderPath) {
      return { success: false, error: 'No path provided' }
    }

    const fullPath = pathModule.resolve(MEDIA_BASE_PATH, folderPath.replace(/^\//, ''))

    if (!fullPath.startsWith(pathModule.resolve(MEDIA_BASE_PATH))) {
      return { success: false, error: 'Access denied: path outside allowed directory' }
    }

    await fs.access(fullPath)
    const folder = await FolderModel.create({
      path: fullPath,
      userId: user?.id,
    })
    return { success: true, folder }
  } catch (error) {
    logger.error(error)
    return { success: false, error: 'Failed to create folder' }
  }
}
