import Redis from 'ioredis'
import { CACHE_TTL, IS_TESTING, REDIS_HOST, REDIS_PORT } from '../constants'

let redisClient: Redis | null = null

function getRedisClient() {
  if (IS_TESTING) return null

  if (!redisClient) {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })

    redisClient.on('error', (err) => {
      console.error('[Redis error]', err)
    })

    redisClient.on('end', () => {
      console.warn('[Redis connection closed]')
      redisClient = null
    })
  }

  return redisClient
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis) return null

  const cached = await redis.get(key)
  return cached ? (JSON.parse(cached) as T) : null
}

export async function setCache<T>(
  key: string,
  value: T,
  ttl = CACHE_TTL
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  await redis.set(key, JSON.stringify(value), 'EX', ttl)
}

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  let cursor = '0'

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    )

    if (keys.length) {
      await redis.del(...keys)
    }

    cursor = nextCursor
  } while (cursor !== '0')
}
