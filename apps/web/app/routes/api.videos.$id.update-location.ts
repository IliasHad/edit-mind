import { type ActionFunctionArgs } from 'react-router';
import { VideoModel } from '@db/index';
import { logger } from '@shared/services/logger'
import { UpdateVideoLocationSchema } from '~/features/videos/schemas';
import { backgroundJobsFetch } from '~/services/background.server';
import { requireUser } from '~/services/user.server';

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    if (request.method === 'PUT') {
      const user = await requireUser(request)
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

      const { data, success, error } = UpdateVideoLocationSchema.safeParse(payload)

      if (!success) {
        return new Response(JSON.stringify({ error: error.flatten() }), {
          status: 400,
        })
      }
      await VideoModel.update(video.id, {
        location: data.newLocation,
      })

      await backgroundJobsFetch("/internal/indexer/update", {
        source: video.source,
        metadata: [{ location: data.newLocation }]
      }, user, "PUT")

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Method not authorized' }), {
      status: 400,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to update a video location')
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem update your video location.' }), {
      status: 500,
    })
  }
}
