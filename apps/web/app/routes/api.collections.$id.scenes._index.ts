import { CollectionItemModel, CollectionModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { getVideoWithScenesBySceneIds } from '@vector/services/db'
import { type LoaderFunctionArgs } from 'react-router'
import type { CollectionItemWithVideo } from '~/features/collections/types'
import { requireUserId } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { id } = params
    const userId = await requireUserId(request)

    const collection = await CollectionModel.findUnique({
      where: { id, userId },
    })

    if (!collection) {
      throw new Response('Collection not found', { status: 404 })
    }

    const items = await CollectionItemModel.findMany({
      where: {
        collectionId: id,
      },
    })

    const sceneIds = items.flatMap((item) => item.sceneIds)
    const scenes = await getVideoWithScenesBySceneIds(sceneIds)

    return { scenes }
  } catch (error) {
    logger.error('Error fetching collection scenes: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch collection scenes' }), { status: 500 })
  }
}
