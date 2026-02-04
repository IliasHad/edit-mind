import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { deleteByVideoSource, getByVideoSource } from '@vector/services/db'
import { existsSync, statSync } from 'fs'
import { JobModel, VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { RelinkVideoSchema } from '~/features/videos/schemas'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser, requireUserId } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params

  if (!id) {
    throw new Response('Video ID not found', { status: 404 })
  }

  try {
    const userId = await requireUserId(request)

    const video = await VideoModel.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        collectionItems: {
          select: {
            collection: {
              select: {
                name: true,
                id: true,
                type: true,
              },
            },
            confidence: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!video) {
      throw new Response('Video not found', { status: 404 })
    }

    const data = await getByVideoSource(video.source)
    if (!data) {
      throw new Response('Scenes not found', { status: 404 })
    }
    const { scenes } = data
    const videoExist = existsSync(video.source)

    const processingJobsCount = await JobModel.count({
      where: {
        videoPath: video.source,
        status: {
          in: ['pending', 'processing'],
        },
      },
    })

    const job = await JobModel.findFirst({
      where: {
        videoPath: video.source,
        status: 'done',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return {
      scenes,
      video: {
        ...video,
        duration: parseInt((video?.duration || '0').toString()),
      },
      videoExist,
      processedJob: {
        ...job,
        fileSize: parseInt((job?.fileSize || '0').toString()),
      },
      isProcessing: processingJobsCount > 0,
    }
  } catch (error) {
    logger.error(error)
    return null
  }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    if (request.method === 'DELETE') {
      const { id } = params

      if (!id) {
        throw new Response('Video ID not found', { status: 404 })
      }
      const userId = await requireUserId(request)
      const video = await VideoModel.findFirst({ where: { id, userId } })
      if (!video) {
        return new Response('Video not found', { status: 404 })
      }

      await deleteByVideoSource(video?.source)
      await VideoModel.delete(video.id)
      await JobModel.deleteMany({
        where: {
          videoPath: video.source,
        },
      })

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    if (request.method === 'PUT') {
      const { id } = params
      const user = await requireUser(request)

      if (!id) {
        throw new Response('Video ID not found', { status: 404 })
      }

      const video = await VideoModel.findFirst({
        where: {
          id,
        },
      })
      if (!video) {
        throw new Response('Video not found', { status: 404 })
      }
      const stats = statSync(video.source)
      const job = await JobModel.create({
        videoPath: video.source,
        userId: user.id,
        folderId: video.folderId,
        fileSize: BigInt(stats.size),
      })

      await backgroundJobsFetch(
        '/internal/indexer/reindex',
        {
          jobId: job.id,
          videoPath: video.source,
          priority: 2,
          forceReIndexing: true,
        },
        user
      )
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
    if (request.method === 'PATCH') {
      const payload = await request.json()
      const { id } = params

      if (!id) {
        throw new Response('Video ID not found', { status: 404 })
      }

      const video = await VideoModel.findFirst({
        where: {
          id,
        },
      })
      if (!video) {
        throw new Response('Video not found', { status: 404 })
      }

      const { data, success, error } = RelinkVideoSchema.safeParse(payload)

      if (!success) {
        return new Response(JSON.stringify({ error: error.flatten() }), {
          status: 400,
        })
      }
      await VideoModel.update(video.id, {
        source: data.newSource,
      })
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Method not authorized' }), {
      status: 400,
    })
  } catch (error) {
    logger.error('Failed to delete a video' + error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem deleting your video.' }), {
      status: 500,
    })
  }
}
