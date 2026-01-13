import jwt from 'jsonwebtoken'
import { logger } from './logger'

export interface JWTPayload {
    userId: string
    email: string
}

export interface JWTOptions {
    expiresIn: `${number}d`
    algorithm: jwt.Algorithm
}

export class JWTService {
    private secret: string

    constructor(secret: string) {
        if (!secret) {
            throw new Error('JWT secret is required')
        }
        this.secret = secret
    }

    encode(payload: JWTPayload, options?: JWTOptions): string {
        try {
            const defaultOptions: JWTOptions = {
                expiresIn: '7d',
                algorithm: 'HS256',
            }

            const token = jwt.sign(payload, this.secret, { ...defaultOptions, ...options })

            return token
        } catch (error) {
            logger.error({ error }, 'JWT encode error:')
            throw new Error('Failed to encode JWT token')
        }
    }

    decode(token: string): JWTPayload | null {
        try {
            const decoded = jwt.decode(token) as JWTPayload | null
            return decoded
        } catch (error) {
            logger.error({ error }, 'JWT decode error')
            return null
        }
    }

    verify(token: string): JWTPayload {
        try {
            const decoded = jwt.verify(token, this.secret) as JWTPayload
            return decoded
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new JWTExpiredError('Token has expired')
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new JWTInvalidError('Invalid token')
            }
            logger.error({ error }, 'JWT verify error')

            throw new Error('Token verification failed')
        }
    }

    verifyAsync(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
        return new Promise((resolve) => {
            try {
                const payload = this.verify(token)
                resolve({ valid: true, payload })
            } catch (error) {
                if (error instanceof JWTExpiredError) {
                    resolve({ valid: false, error: 'Token expired' })
                } else if (error instanceof JWTInvalidError) {
                    resolve({ valid: false, error: 'Invalid token' })
                } else {
                    resolve({ valid: false, error: 'Verification failed' })
                }
            }
        })
    }

    extractFromHeader(authHeader?: string): string | null {
        if (!authHeader) {
            return null
        }

        const parts = authHeader.split(' ')
        if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1]
        }

        return null
    }
}

export class JWTExpiredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'JWTExpiredError'
    }
}

export class JWTInvalidError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'JWTInvalidError'
    }
}

export const createJWTService = (secret: string) => new JWTService(secret)
