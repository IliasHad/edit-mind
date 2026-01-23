import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

/**
 * JWT token generation utilities for testing
 */

const TEST_SECRET = 'test-secret-key-for-jwt'

/**
 * Generate a valid JWT token with userId and email claims
 */
export function generateValidToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, TEST_SECRET, { expiresIn: '24h' })
}

/**
 * Generate an expired JWT token
 */
export function generateExpiredToken(): string {
  const userId = uuidv4()
  const email = `test-${userId}@example.com`
  return jwt.sign({ userId, email }, TEST_SECRET, { expiresIn: '-1h' })
}

/**
 * Generate an invalid JWT token (signed with wrong secret)
 */
export function generateInvalidToken(): string {
  const userId = uuidv4()
  const email = `test-${userId}@example.com`
  return jwt.sign({ userId, email }, 'wrong-secret', { expiresIn: '24h' })
}

/**
 * Generate a malformed token (not a valid JWT format)
 */
export function generateMalformedToken(): string {
  return 'not.a.valid.jwt.token'
}

/**
 * Generate a token with missing userId claim
 */
export function generateTokenWithoutUserId(): string {
  return jwt.sign({ email: 'test@example.com' }, TEST_SECRET, { expiresIn: '24h' })
}

/**
 * Generate a token with missing email claim
 */
export function generateTokenWithoutEmail(): string {
  return jwt.sign({ userId: uuidv4() }, TEST_SECRET, { expiresIn: '24h' })
}

/**
 * Mock JWT Service for testing
 */
export class MockJWTService {
  constructor(private secret: string = TEST_SECRET) {}

  /**
   * Extract JWT token from Authorization header
   */
  extractFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    return parts[1]
  }

  /**
   * Verify and decode JWT token
   */
  verify(token: string): { userId: string; email: string } {
    const decoded = jwt.verify(token, this.secret) as { userId: string; email: string }
    return decoded
  }

  /**
   * Sign a new JWT token
   */
  sign(payload: { userId: string; email: string }, expiresIn: number = 30): string {
    return jwt.sign(payload, this.secret, { expiresIn })
  }
}

/**
 * Get the test secret for mocking
 */
export function getTestSecret(): string {
  return TEST_SECRET
}
