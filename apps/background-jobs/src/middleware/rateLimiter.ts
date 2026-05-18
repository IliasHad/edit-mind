import rateLimit from 'express-rate-limit'
import { logger } from '@shared/services/logger'

export const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error(`Rate limit exceeded for IP: ${req.ip}, url: ${req.url}`)
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later.',
    })
  },
})

// Per-user rate limiter for external API routes — keyed on userId set by requireAccessToken
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.userId ?? 'unauthenticated',
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`API rate limit exceeded for userId: ${req.userId ?? req.ip}, url: ${req.url}`)
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later.',
    })
  },
})

