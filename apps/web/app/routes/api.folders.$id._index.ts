import { FolderModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type LoaderFunctionArgs } from 'react-router'

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
