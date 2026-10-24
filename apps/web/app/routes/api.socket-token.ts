import type { LoaderFunctionArgs } from 'react-router'
import { createJWTService } from '@shared/services/jwt'
import { requireUser } from '~/services/user.server'
import { env } from '~/env'

/** Issues a dedicated token for the authenticated Socket.IO status connection. */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireUser(request)
    const token = createJWTService(env.SESSION_SECRET).encode(
      { userId: user.id, email: user.email },
      { expiresIn: '1d' }
    )

    return Response.json(
      { token },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
