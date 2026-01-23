import { logger } from '@shared/services/logger'
import { RedisOptions } from 'ioredis';
import { env } from '../utils/env'

export const connection: RedisOptions = {
  host: env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null,

  retryStrategy: (times: number) => {
    if (times > 50) {
      logger.error('Redis max retries reached')
      return null // Stop retrying
    }
    const delay = Math.min(times * 1000, 20000)
    logger.warn(`Redis retry attempt ${times}, retrying in ${delay}ms`)
    return delay
  },

  reconnectOnError: (err: Error) => {
    const errorMessage = err.message || ''
    if (
      errorMessage.includes('READONLY') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNRESET')
    ) {
      logger.warn(`Redis reconnecting: ${errorMessage}`)
      return 1
    }
    return false
  },

  connectTimeout: 30000,
  commandTimeout: 60000,
  keepAlive: 30000,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  enableAutoPipelining: false,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
}