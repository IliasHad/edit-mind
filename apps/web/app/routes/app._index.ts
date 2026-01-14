import { logger } from '@shared/services/logger'
import { redirect, type LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)

    if (!user) {
      throw redirect('/auth/login')
    }

    return redirect('/app/home')
  } catch (error) {
    logger.error(error)
    throw redirect('/auth/login')
  }
}
