import { logger } from '@shared/services/logger'
import { getVideoWithScenesBySceneIds } from '@vector/services/vectorDb'
import { type LoaderFunctionArgs } from 'react-router'
import { prisma } from '~/services/database'
import { requireUser } from '~/services/user.sever'

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { id } = params
    await requireUser(request)

    const collection = await prisma.collection.findFirst({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!collection) {
      throw new Response('Collection not found', { status: 404 })
    }

    const sceneIds = collection.items.flatMap((item) => item.sceneIds)
    const scenes = await getVideoWithScenesBySceneIds(sceneIds)

    return { scenes }
  } catch (error) {
    logger.error('Error fetching collection scenes: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection scenes' }), { status: 500 })
  }
}
