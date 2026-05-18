import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { AccessTokenScope } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { AccessTokenModel } from '@db/models/AccessToken'

export async function requireAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' })
      return
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token format' })
      return
    }

    const rawToken = parts[1]
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const accessToken = await AccessTokenModel.findByHash(tokenHash)
    if (!accessToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' })
      return
    }

    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token expired' })
      return
    }

    const ip = req.ip || req.socket?.remoteAddress || ''
    const allowedIps = accessToken.allowedIps
    if (allowedIps.length > 0 && !allowedIps.includes('*') && !allowedIps.includes(ip)) {
      res.status(403).json({ error: 'Forbidden', message: 'IP not allowed' })
      return
    }

    req.userId = accessToken.userId
    req.accessTokenScopes = accessToken.scopes

    void AccessTokenModel.updateLastUsed(accessToken.id, ip, req.headers['user-agent'])
      .catch((err) => logger.warn({ err }, 'updateLastUsed failed'))

    next()
  } catch (error) {
    logger.error({ error }, 'Access token auth middleware error')
    res.status(500).json({ error: 'Server error', message: 'Authentication failed' })
  }
}

export function requireScopes(...requiredScopes: AccessTokenScope[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.accessTokenScopes) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' })
      return
    }

    const hasAllScopes = requiredScopes.every((scope) => req.accessTokenScopes!.includes(scope))

    if (!hasAllScopes) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' })
      return
    }

    next()
  }
}
