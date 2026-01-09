import { type ActionFunctionArgs } from 'react-router'
import { requireUser } from '~/services/user.sever'
import { logger } from '@shared/services/logger'
import { backgroundJobsFetch } from '~/services/background.server'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireUser(request)
    const { imageFile, jsonFile } = await request.json()

    if (request.method === 'DELETE') {
      try {
        await backgroundJobsFetch('/face', { imageFile, jsonFile }, user, 'DELETE')
      } catch (error) {
        logger.error(error)
        return new Response('Internal Server Error', { status: 500 })
      }
    }

    if (request.method === 'PATCH') {
      return new Response('Method not allowed', { status: 405 })
    }

    if (request.method === 'PUT') {
      return new Response('Method not allowed', { status: 405 })
    }
  } catch (error) {
    logger.error('Error processing face')
    logger.error(error)
    return { success: false, error: 'Failed to process face' }
  }
}
