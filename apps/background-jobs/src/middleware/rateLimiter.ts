import rateLimit from 'express-rate-limit'
import { logger } from '@shared/services/logger'


export const rateLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    message: {
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    handler: (req, res) => {
        logger.error(`Rate limit exceeded for IP: ${req.ip}`)
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many requests from this IP, please try again later.',
        })
    },
})

