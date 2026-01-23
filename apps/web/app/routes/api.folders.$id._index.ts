import { FolderModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'

export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const { id } = params

    if (id) {
      const folder = await FolderModel.findById(id)

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

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { id } = params

    const user = await requireUser(request)

    if (request.method === 'DELETE') {
      await backgroundJobsFetch(`/internal/folders/${id}`, undefined, user, 'DELETE')
      return new Response(JSON.stringify({ message: 'Folder has been deleted', success: true }), {
        status: 204,
      })
    }
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem deleting your folder.' }), {
      status: 500,
    })
  }
}
