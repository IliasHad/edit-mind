import { logger } from '@shared/services/logger'
import { redirect, useRouteError, type LoaderFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.sever'

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

export function ErrorBoundary() {
  const error = useRouteError()

  return new Response(JSON.stringify({ error }), { status: 500 })
}
