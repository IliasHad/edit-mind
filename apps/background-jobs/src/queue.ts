import { Queue } from 'bullmq'
import { config } from './config'
import IORedis from 'ioredis'
import { logger } from '@shared/services/logger'

// Resilient Redis connection with exponential backoff
// Addresses Docker Desktop networking instability on Windows/WSL2
export const connection = new IORedis({
  host: config.redisHost,
  port: config.redisPort,
  maxRetriesPerRequest: null, // Required by BullMQ
  
  // Connection resilience settings
  retryStrategy: (times: number) => {
    // Exponential backoff: 100ms, 200ms, 400ms, ... up to 30s max
    const delay = Math.min(Math.pow(2, times) * 100, 30000)
    logger.warn(`Redis connection retry #${times}, next attempt in ${delay}ms`)
    return delay
  },
  
  // Reconnect on error
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED']
    if (targetErrors.some(e => err.message.includes(e))) {
      logger.warn(`Redis reconnecting due to: ${err.message}`)
      return true // Reconnect for these errors
    }
    return false
  },
  
  // Connection timeouts
  connectTimeout: 30000,      // 30s to establish connection
  commandTimeout: 60000,      // 60s for commands (long jobs)
  
  // Keep-alive settings
  keepAlive: 30000,           // Send TCP keepalive every 30s
  
  // Auto-reconnect
  enableReadyCheck: true,
  enableOfflineQueue: true,   // Queue commands while disconnected
})

// Log connection events
connection.on('connect', () => {
  logger.info('Redis connected')
})

connection.on('ready', () => {
  logger.info('Redis ready')
})

connection.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`)
})

connection.on('close', () => {
  logger.warn('Redis connection closed')
})

connection.on('reconnecting', () => {
  logger.info('Redis reconnecting...')
})

export const videoQueue = new Queue('video-indexing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const faceMatcherQueue = new Queue('face-matcher', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const immichImporterQueue = new Queue('immich-importer', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const videoStitcherQueue = new Queue('video-stitcher', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

