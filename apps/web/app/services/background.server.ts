import { createJWTService } from '@shared/services/jwt'
import { logger } from '@shared/services/logger'
import { env } from '~/env'

export async function backgroundJobsFetch<B, R>(
  endpoint: string,
  bodyParams: B,
  user: { id: string; email: string },
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
) {
  const backgroundJobsUrl = env.BACKGROUND_JOBS_URL

  try {
    const jwt = createJWTService(env.SESSION_SECRET)
    const token = jwt.encode({
      userId: user.id,
      email: user.email,
    })

    const response = await fetch(`${backgroundJobsUrl}${endpoint}`, {
      method: method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(method !== 'GET' && { body: JSON.stringify(bodyParams) }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(errorBody)
    }

    const data = await response.json()

    return data as R
  } catch (error) {
    logger.error(error)
    throw error
  }
}
