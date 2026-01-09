import { logger } from '@shared/services/logger'
import { type LoaderFunctionArgs } from 'react-router';
import { getUser } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authorized' }), { status: 401 })
    }
  } catch (error) {
    logger.error(error)
    return null
  }
}
