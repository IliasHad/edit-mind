import { logger } from '@shared/services/logger'
import { redirect, type LoaderFunctionArgs } from 'react-router';
import { getUser } from '~/services/user.server'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)
    if (!user) {
      return redirect('/auth/login')
    }
  } catch (error) {
    logger.error(error)
    return null
  }
}
