import { createHmac, timingSafeEqual } from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { env } from '../utils/env'

// React Router's createCookieSessionStorage signs cookies as:
//   <base64(JSON.stringify(data))>.<base64(HMAC-SHA256(encodedData, secret))>
// and encodes session data as Buffer.from(JSON.stringify(data), 'utf8').toString('base64').
function verifyReactRouterSession(cookieValue: string, secret: string): { userId: string } | null {
  const lastDot = cookieValue.lastIndexOf('.')
  if (lastDot === -1) return null

  const encodedData = cookieValue.slice(0, lastDot)
  const receivedSig = cookieValue.slice(lastDot + 1)

  const expectedSig = createHmac('sha256', secret).update(encodedData).digest('base64').replace(/=+$/, '')

  if (receivedSig.length !== expectedSig.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))) return null
  } catch {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8')) as Record<string, unknown>
    const userId = typeof data.userId === 'string' ? data.userId : null
    if (!userId) return null
    return { userId }
  } catch {
    return null
  }
}

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...value] = part.trim().split('=')
      return [key.trim(), decodeURIComponent(value.join('='))]
    })
  )
}

export function requireQueueAuth(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie)
  const cookieName = process.env.NODE_ENV === 'production' ? '__session' : '__session_dev'
  const cookieValue = cookies[cookieName]

  if (cookieValue && verifyReactRouterSession(cookieValue, env.SESSION_SECRET)) {
    next()
    return
  }

  const publicWebUrl = env.WEB_APP_URL.replace('web', 'localhost')
  const returnTo = `${req.protocol}://${req.get('host')}${req.originalUrl}`
  res.redirect(`${publicWebUrl}/auth/login?next=${encodeURIComponent(returnTo)}`)
}
