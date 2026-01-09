import { logger } from '@shared/services/logger'
import jwt from 'jsonwebtoken'
import { env } from '~/env'

export async function backgroundJobsFetch<B, R>(
  endpoint: string,
  bodyParams: B,
  user: { id: string; email: string },
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
) {
  const backgroundJobsUrl = env.BACKGROUND_JOBS_URL

  try {
    const token = generateToken({
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

interface TokenPayload {
  userId: string
  email?: string
}

export function generateToken(payload: TokenPayload, expiresIn: `${number}d` = '30d'): string {
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn })
}
