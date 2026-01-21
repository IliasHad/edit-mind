import { logger } from '@shared/services/logger'
import IORedis, { Redis, RedisOptions } from 'ioredis'
import { env } from '../utils/env'

class RedisConnection {
  private static instance: Redis | null = null
  private static readonly CONNECTION_TIMEOUT_MS = 30000
  private static readonly COMMAND_TIMEOUT_MS = 60000
  private static readonly KEEPALIVE_INTERVAL_MS = 30000

  private static readonly RETRIABLE_ERRORS = [
    'READONLY',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
  ] as const

  static getConnection(): Redis {
    if (!this.instance) {
      this.instance = this.createConnection()
    }
    return this.instance
  }

  private static createConnection(): Redis {
    const options: RedisOptions = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null, // Required for BullMQ

      // Retry strategy with exponential backoff
      retryStrategy: this.createRetryStrategy(),

      // Reconnect on specific errors
      reconnectOnError: this.createReconnectHandler(),

      // Connection timeouts
      connectTimeout: this.CONNECTION_TIMEOUT_MS,
      commandTimeout: this.COMMAND_TIMEOUT_MS,

      // Keep-alive settings for long-lived connections
      keepAlive: this.KEEPALIVE_INTERVAL_MS,

      // Connection management
      enableReadyCheck: true,
      enableOfflineQueue: true, // Queue commands during disconnection

      // Lazy connection for better startup performance
      lazyConnect: false,

      // Additional production settings
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,

      // Performance optimizations
      enableAutoPipelining: false,

      // Graceful degradation
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    }

    const redis = new IORedis(options)

    this.setupEventHandlers(redis)

    return redis
  }
  
    /**
   * Creates retry strategy with exponential backoff and jitter
   */
  private static createRetryStrategy() {
    return (times: number): number => {
      const baseDelay = Math.min(1000 * Math.pow(2, times), 20000)
      const jitter = baseDelay * (Math.random() * 0.4 - 0.2)
      const delay = Math.max(1000, baseDelay + jitter)

      logger.warn(`Redis retry attempt ${times}, retrying in ${Math.round(delay)}ms`)
      return delay
    }
  }

  private static createReconnectHandler() {
    return (err: Error): boolean | 1 | 2 => {
      const shouldReconnect = this.RETRIABLE_ERRORS.some((errorCode) => err.message.includes(errorCode))

      if (shouldReconnect) {
        logger.warn(`Redis reconnecting due to retriable error: ${err.message}`)
        return 1
      }

      logger.error(`Redis non-retriable error encountered: ${err.message}`)
      return false
    }
  }

  private static setupEventHandlers(redis: Redis): void {
    redis.removeAllListeners()

    redis.on('connect', () => {
      logger.info('Redis connection established')
    })

    redis.on('ready', () => {
      logger.info('Redis connection ready for commands')
    })

    redis.on('error', (err: Error) => {
      const errorMessage = err.message || err.toString()
      const isRetriable = this.RETRIABLE_ERRORS.some((errorCode) => errorMessage.includes(errorCode))

      if (errorMessage.includes('EPIPE') || errorMessage.includes('ECONNRESET')) {
        // Broken pipe or connection reset - expected during reconnections
        logger.warn(`Redis connection error (will auto-recover): ${errorMessage}`)
      } else if (isRetriable) {
        logger.warn(`Redis retriable error (auto-reconnecting): ${errorMessage}`)
      } else {
        logger.error(`Redis error: ${errorMessage}`)
      }

      // IMPORTANT: By having this handler, the error is now "handled"
      // and won't crash the process or show as unhandled
    })

    redis.on('close', () => {
      logger.warn('Redis connection closed')
    })

    redis.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms...`)
    })

    redis.on('end', () => {
      logger.warn('Redis connection ended permanently')
      this.instance = null
    })
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      logger.info('Gracefully disconnecting Redis connection...')
      try {
        // Remove listeners before disconnecting
        this.instance.removeAllListeners()
        await this.instance.quit()
        this.instance = null
        logger.info('Redis connection closed successfully')
      } catch (error) {
        logger.error({ error }, `Error during Redis disconnect`)
        this.instance?.disconnect()
        this.instance = null
      }
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const redis = this.getConnection()
      const result = await redis.ping()
      return result === 'PONG'
    } catch (error) {
      logger.error({ error }, `Redis health check failed`)
      return false
    }
  }
}

export const connection = RedisConnection.getConnection()
export const disconnectRedis = () => RedisConnection.disconnect()
export const redisHealthCheck = () => RedisConnection.healthCheck()

if (process.env.NODE_ENV === 'production') {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, closing Redis connection...`)
    await RedisConnection.disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}
