import { logger } from '@shared/services/logger'
import { RedisOptions } from 'ioredis'
import { env } from '../utils/env'

export const connection: RedisOptions = {
  host: env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null,

  retryStrategy: (times: number) => {
    const delay = Math.min(Math.pow(2, times) * 100, 30000)
    logger.warn(`Redis retry attempt ${times}, retrying in ${delay}ms`)
    return delay
  },

  reconnectOnError: (err: Error) => {
    const errorMessage = err.message || ''
    if (
      errorMessage.includes('READONLY') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('OOM') ||
      errorMessage.includes('LOADING')
    ) {
      logger.warn(`Redis reconnecting: ${errorMessage}`)
      return 2
    }
    return false
  },

  connectTimeout: 30000,
  commandTimeout: 120000,
  keepAlive: 30000,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  enableAutoPipelining: false,
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
}
