import { createJWTService, JWTExpiredError, JWTInvalidError } from '@shared/services/jwt'
import { Request, Response, NextFunction } from 'express'
import { logger } from '@shared/services/logger'
import { env } from '../utils/env'
import { UserModel } from '@db/models/User'

export interface AuthenticatedRequest extends Request {
  userId: string
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jwt = createJWTService(env.SESSION_SECRET)
    const token = jwt.extractFromHeader(req.headers['authorization'])

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      })
      return
    }

    const decoded = jwt.verify(token)

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      })
      return
    }

    const user = await UserModel.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      })
      return
    }

    ;(req as AuthenticatedRequest).userId = decoded.userId

    next()
  } catch (error) {
    if (error instanceof JWTInvalidError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      })
      return
    }

    if (error instanceof JWTExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      })
      return
    }

    logger.error({ error }, 'Auth middleware error')
    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed',
    })
  }
}
