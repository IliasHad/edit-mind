import rateLimit from 'express-rate-limit'
import { logger } from '@shared/services/logger'


export const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // Limit each IP to 300 requests per windowMs
    message: {
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    handler: (req, res) => {
        logger.error(`Rate limit exceeded for IP: ${req.ip}, url: ${req.url}`)
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many requests from this IP, please try again later.',
        })
    },
})

