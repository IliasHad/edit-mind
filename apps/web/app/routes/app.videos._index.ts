import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { redirect } from 'react-router'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')
  const startTime = url.searchParams.get('startTime')

  if (!source) {
    throw new Response('Video not found', { status: 404 })
  }

  try {
    const video = await VideoModel.findFirst({
      where: {
        source: decodeURIComponent(source),
      },
    })
    if (video) {
      return redirect(`/app/videos/${video.id}?startTime=${startTime}`)
    }
  } catch (error) {
    logger.error(error)
    throw new Error('Video not found')
  }
}
