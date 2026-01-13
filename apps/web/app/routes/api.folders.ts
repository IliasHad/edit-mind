import { logger } from '@shared/services/logger'
import { requireUserId } from '~/services/user.sever'
import { FolderModel, VideoModel } from '@db/index'

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
