import { FolderModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'

export async function action({ params, request }: ActionFunctionArgs) {
  try {
    const { id } = params

    if (id) {
      const user = await requireUser(request)
      const folder = await FolderModel.findById(id)

      await backgroundJobsFetch(`/internal/folders/${folder?.id}/trigger`, undefined, user, 'POST')
      return {
        folder,
      }
    }
    throw new Error('Folder ID not set')
  } catch (error) {
    logger.error('Error fetching folder details: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch folder details' }), { status: 500 })
  }
}
