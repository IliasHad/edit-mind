import { CACHE_TTL, IS_TESTING, REDIS_HOST, REDIS_PORT } from '../constants';
import Redis from 'ioredis'

// Only create Redis client if not testing
export const redisClient = IS_TESTING
  ? null
  : new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
    })

export async function getCache<T>(key: string): Promise<T | null> {
  if (IS_TESTING || !redisClient) return null
  const cached = await redisClient.get(key)
  if (!cached) return null
  return JSON.parse(cached) as T
}

export async function setCache<T>(key: string, value: T, ttl = CACHE_TTL): Promise<void> {
  if (IS_TESTING || !redisClient) return
  await redisClient.set(key, JSON.stringify(value), 'EX', ttl)
}

export async function invalidateCache(keyPattern: string): Promise<void> {
  if (IS_TESTING || !redisClient) return
  const keys = await redisClient.keys(keyPattern)
  if (keys.length > 0) {
    await redisClient.del(...keys)
  }
}
