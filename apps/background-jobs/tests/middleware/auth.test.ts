import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'

import { AuthenticatedRequest, requireAuth } from '@background-jobs/middleware/auth'
import { createJWTService, JWTExpiredError, JWTInvalidError, JWTService } from '@shared/services/jwt'
import { UserModel } from '@db/models/User'
import { User } from '@prisma/client'

vi.mock('@background-jobs/utils/env', () => ({
  env: {
    SESSION_SECRET: 'test-secret-key-for-jwt',
  },
}))

vi.mock('@shared/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@shared/services/jwt', () => ({
  createJWTService: vi.fn(),
  JWTExpiredError: class JWTExpiredError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'JWTExpiredError'
    }
  },
  JWTInvalidError: class JWTInvalidError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'JWTInvalidError'
    }
  },
}))

vi.mock('@db/models/User', () => ({
  UserModel: {
    findUnique: vi.fn(),
  },
}))

describe('Auth Middleware', () => {
  let app: Express
  let mockJWTService: {
    extractFromHeader: Mock<JWTService['extractFromHeader']>
    verify: Mock<JWTService['verify']>
    encode: Mock<JWTService['encode']>
    verifyAsync: Mock<JWTService['verifyAsync']>
    decode: Mock<JWTService['decode']>
    secret: string
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockJWTService = {
      extractFromHeader: vi.fn(),
      verify: vi.fn(),
      encode: vi.fn(),
      verifyAsync: vi.fn(),
      decode: vi.fn(),
      secret: 'test-secret-key-for-jwt',
    }

    vi.mocked(createJWTService).mockReturnValue(mockJWTService as unknown as JWTService)

    app = express()
    app.use(express.json())
    app.use(requireAuth)
    app.get('/test', (req, res) => {
      res.json({ success: true, userId: (req as AuthenticatedRequest).userId })
    })
  })

  it('should allow requests with valid token', async () => {
    const mockUserId = 'user-123'
    const mockUser: User = {
      id: mockUserId,
      email: 'user@example.com',
      password: 'test',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'test',
    }

    mockJWTService.extractFromHeader.mockReturnValue('valid-token')
    mockJWTService.verify.mockReturnValue({ userId: mockUserId, email: 'user@example.com' })
    vi.mocked(UserModel.findUnique).mockResolvedValue(mockUser)

    const response = await request(app).get('/test').set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true, userId: mockUserId })
    expect(mockJWTService.extractFromHeader).toHaveBeenCalledWith('Bearer valid-token')
    expect(mockJWTService.verify).toHaveBeenCalledWith('valid-token')
    expect(UserModel.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
    })
  })

  it('should reject requests with no token', async () => {
    mockJWTService.extractFromHeader.mockReturnValue(null)

    const response = await request(app).get('/test')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'No token provided',
    })
  })

  it('should reject requests with invalid token payload', async () => {
    mockJWTService.extractFromHeader.mockReturnValue('invalid-token')

    const response = await request(app).get('/test').set('Authorization', 'Bearer invalid-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token payload',
    })
  })

  it('should reject requests when user is not found', async () => {
    mockJWTService.extractFromHeader.mockReturnValue('valid-token')
    mockJWTService.verify.mockReturnValue({ userId: 'nonexistent-user', email: 'nonexistent@example.com' })
    vi.mocked(UserModel.findUnique).mockResolvedValue(null)

    const response = await request(app).get('/test').set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'User not found',
    })
  })

  it('should reject requests with invalid token', async () => {
    mockJWTService.extractFromHeader.mockReturnValue('invalid-token')
    mockJWTService.verify.mockImplementation(() => {
      throw new JWTInvalidError('Invalid token')
    })

    const response = await request(app).get('/test').set('Authorization', 'Bearer invalid-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token',
    })
  })

  it('should reject requests with expired token', async () => {
    mockJWTService.extractFromHeader.mockReturnValue('expired-token')
    mockJWTService.verify.mockImplementation(() => {
      throw new JWTExpiredError('Token expired')
    })

    const response = await request(app).get('/test').set('Authorization', 'Bearer expired-token')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Token expired',
    })
  })

  it('should handle unexpected errors', async () => {
    const { logger } = await import('@shared/services/logger')

    mockJWTService.extractFromHeader.mockReturnValue('valid-token')
    mockJWTService.verify.mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    const response = await request(app).get('/test').set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: 'Server error',
      message: 'Authentication failed',
    })
    expect(logger.error).toHaveBeenCalled()
  })

  it('should attach userId to request object', async () => {
    const mockUserId = 'user-456'
    const mockUser: User = {
      id: mockUserId,
      email: `${mockUserId}@example.com`,
      password: 'test',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'test',
    }

    mockJWTService.extractFromHeader.mockReturnValue('valid-token')
    mockJWTService.verify.mockReturnValue({ userId: mockUserId, email: mockUser.email })
    vi.mocked(UserModel.findUnique).mockResolvedValue(mockUser)

    const response = await request(app).get('/test').set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body.userId).toBe(mockUserId)
  })
})
