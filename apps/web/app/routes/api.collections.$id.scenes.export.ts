import { CollectionModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { ActionFunction } from 'react-router'
import { CollectionExportSchema } from '~/features/collections/schemas'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.server'

export const action: ActionFunction = async ({ request, params }) => {
  try {
    const { id } = params

    if (!id) {
      return new Response(JSON.stringify({ error: 'Collection ID required' }), { status: 404 })
    }

    const collection = await CollectionModel.findById(id)

    if (!collection) {
      return new Response(JSON.stringify({ error: 'Collection not found' }), { status: 404 })
    }

    const user = await requireUser(request)

    const payload = await request.json()

    const form = CollectionExportSchema.safeParse(payload)

    if (!form.success) {
      throw new Error('Error getting scene ids')
    }

    const { selectedSceneIds } = form.data

    await backgroundJobsFetch(
      '/internal/exports',
      {
        selectedSceneIds,
        collectionId: collection.id,
      },
      user,
      'POST'
    )
    return new Response(
      JSON.stringify({ message: 'Your video request has been to the background jobs for exporting' }),
      { status: 200 }
    )
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Error queuing your video for exporting' }), { status: 500 })
  }
}
