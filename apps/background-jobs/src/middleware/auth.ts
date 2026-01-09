import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { env } from 'src/utils/env'

const prisma = new PrismaClient()

export interface AuthenticatedRequest extends Request {
  userId: string
}
interface JWTPayload {
  userId: string
  email?: string
  iat?: number
  exp?: number
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      })
      return
    }

    const decoded = jwt.verify(token, env.SESSION_SECRET?.toString()) as JWTPayload

    if (!decoded.userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      })
      return
    }

    ; (req as AuthenticatedRequest).userId = decoded.userId

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      })
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      })
      return
    }

    logger.error('Auth middleware error: ' + error)
    res.status(500).json({
      error: 'Server error',
      message: 'Authentication failed',
    })
  }
}
