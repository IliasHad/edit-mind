import { logger } from '@shared/services/logger'
import { requireUser, requireUserId } from '~/services/user.server'
import { FolderModel, VideoModel } from '@db/index'
import type { ActionFunctionArgs } from 'react-router'
import { FolderCreateSchema } from '~/features/folders/schemas/folder'

export async function loader({ request }: { request: Request }) {
  try {
    const userId = await requireUserId(request)

    const folders = await FolderModel.findMany({
      where: {
        userId,
      },
      omit: {
        userId: true,
      },
    })

    const videos = await VideoModel.findMany({
      where: {
        userId,
      },
      select: {
        duration: true,
      },
    })

    const totalVideos = videos.length
    const totalDuration = videos.reduce((a, b) => a + parseInt(b.duration.toString()), 0)

    return { folders, totalVideos, totalDuration }
  } catch (error) {
    logger.error({ error }, 'Failed to fetch folders')
    return { folders: [], totalVideos: 0, totalDuration: 0 }
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const payload = await request.json()

  try {
    const { success, data, error } = FolderCreateSchema.safeParse(payload)

    if (!success) {
      logger.error(error)
      return new Response(JSON.stringify({ error: 'Error validating your folder input' }), {
        status: 500,
      })
    }

    const user = await requireUser(request)

    const { path, watcherEnabled, excludePatterns, includePatterns } = data

    const folder = await FolderModel.create({
      path,
      watcherEnabled,
      excludePatterns,
      includePatterns,
      userId: user.id,
    })

    return {
      folder,
    }
  } catch (error) {
    logger.error('Failed to send folder to background jobs service' + error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem creating your folder.' }), {
      status: 500,
    })
  }
}
