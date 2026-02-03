import { FolderModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser, requireUserId } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { id } = params
    const userId = await requireUserId(request)

    if (id) {
      const folder = await FolderModel.findUnique({
        where: {
          id,
          userId,
        },
      })

      if (!folder) return new Response(JSON.stringify({ error: 'Folder not found' }), { status: 404 })

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

    const folder = await FolderModel.findUnique({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!folder) return new Response(JSON.stringify({ error: 'Folder not found' }), { status: 404 })

    if (request.method === 'DELETE') {
      await backgroundJobsFetch(`/internal/folders/${id}`, undefined, user, 'DELETE')
      return new Response(JSON.stringify({ message: 'Folder has been deleted', success: true }), {
        status: 200,
      })
    }
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Sorry, there was a problem deleting your folder.' }), {
      status: 500,
    })
  }
}
