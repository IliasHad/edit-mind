import { logger } from '@shared/services/logger'
import IORedis, { Redis, RedisOptions } from 'ioredis'
import { env } from 'src/utils/env'

class RedisConnection {
  private static instance: Redis | null = null
  private static readonly MAX_RETRY_DELAY_MS = 30000
  private static readonly INITIAL_RETRY_DELAY_MS = 1000
  private static readonly CONNECTION_TIMEOUT_MS = 30000
  private static readonly COMMAND_TIMEOUT_MS = 60000
  private static readonly KEEPALIVE_INTERVAL_MS = 30000

  private static readonly RETRIABLE_ERRORS = [
    'READONLY',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EPIPE',
    'ENOTFOUND',
  ] as const

  static getConnection(): Redis {
    if (!this.instance) {
      this.instance = this.createConnection()
      this.setupEventHandlers(this.instance)
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
      enableAutoPipelining: true,

      // Graceful degradation
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    }

    return new IORedis(options)
  }

  /**
   * Creates retry strategy with exponential backoff and jitter
   */
  private static createRetryStrategy() {
    return (times: number): number => {
      if (times > 10) {
        logger.error(`Redis retry limit exceeded after ${times} attempts. Manual intervention required.`)
        // Return null to stop retrying (will emit error event)
        return -1
      }

      // Exponential backoff with jitter
      const exponentialDelay = Math.pow(2, times) * this.INITIAL_RETRY_DELAY_MS
      const jitter = Math.random() * 1000 // Add up to 1s of jitter
      const delay = Math.min(exponentialDelay + jitter, this.MAX_RETRY_DELAY_MS)

      logger.warn(`Redis connection retry attempt ${times}/${10}. Next attempt in ${Math.round(delay)}ms`)

      return delay
    }
  }

  private static createReconnectHandler() {
    return (err: Error): boolean | 1 | 2 => {
      const shouldReconnect = this.RETRIABLE_ERRORS.some((errorCode) => err.message.includes(errorCode))

      if (shouldReconnect) {
        logger.warn(`Redis reconnecting due to retriable error: ${err.message}`)
        return 1 // Reconnect immediately
      }

      logger.error(`Redis non-retriable error encountered: ${err.message}`)
      return false
    }
  }

  private static setupEventHandlers(redis: Redis): void {
    redis.on('connect', () => {
      logger.info('Redis connection established')
    })

    redis.on('ready', () => {
      logger.info('Redis connection ready for commands')
    })

    redis.on('error', (err: Error) => {
      logger.error(`Redis connection error ${err}`)
    })

    redis.on('close', () => {
      logger.warn('Redis connection closed')
    })

    redis.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms...`)
    })

    redis.on('end', () => {
      logger.warn('Redis connection ended permanently')
      this.instance = null // Allow recreation on next getConnection()
    })
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      logger.info('Gracefully disconnecting Redis connection...')
      try {
        await this.instance.quit()
        this.instance = null
        logger.info('Redis connection closed successfully')
      } catch (error) {
        logger.error(`Error during Redis disconnect ${error}`)
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
      logger.error(`Redis health check failed ${error}`)
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
