import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { redirect } from 'react-router'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')
  const startTime = url.searchParams.get('startTime')

  if (!source) {
    return new Response('source is required', { status: 400 })
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

    return new Response('Video not found', { status: 404 })
  } catch (error) {
    logger.error(error)
    return new Response('Error loading your video', { status: 500 })
  }
}
