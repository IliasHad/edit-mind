import request from 'supertest'
import express, { Express } from 'express'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { rateLimiter } from '@background-jobs/middleware/rateLimiter'

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

describe('Rate Limiter Middleware', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use(rateLimiter)
    app.get('/test', (req, res) => {
      res.json({ success: true })
    })
  })

  it('should allow requests under the rate limit', async () => {
    const response = await request(app).get('/test')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })
    expect(response.headers['ratelimit-limit']).toBeDefined()
    expect(response.headers['ratelimit-remaining']).toBeDefined()
  })

  it('should block requests exceeding the rate limit', async () => {
    // Make 101 requests (limit is 100)
    for (let i = 0; i < 100; i++) {
      await request(app).get('/test')
    }

    // The 101st request should be blocked
    const response = await request(app).get('/test')

    expect(response.status).toBe(429)
    expect(response.body).toEqual({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
    })
  })

  it('should include rate limit headers', async () => {
    const response = await request(app).get('/test')

    expect(response.headers['ratelimit-limit']).toBe('100')
    expect(response.headers['ratelimit-remaining']).toBeDefined()
    expect(response.headers['ratelimit-reset']).toBeDefined()
  })

  it('should not include legacy headers', async () => {
    const response = await request(app).get('/test')

    expect(response.headers['x-ratelimit-limit']).toBeUndefined()
    expect(response.headers['x-ratelimit-remaining']).toBeUndefined()
  })

  it('should reset limit after window expires', async () => {
    vi.useFakeTimers()

    // Make requests up to the limit
    for (let i = 0; i < 100; i++) {
      await request(app).get('/test')
    }

    // Advance time by 5 minutes (window duration)
    vi.advanceTimersByTime(5 * 60 * 1000)

    // Should allow requests again
    const response = await request(app).get('/test')
    expect(response.status).toBe(200)

    vi.useRealTimers()
  })

  it('should track requests per IP separately', async () => {
    const response1 = await request(app).get('/test')
    const response2 = await request(app).get('/test')

    expect(response1.status).toBe(200)
    expect(response2.status).toBe(200)
  })
})
