import { MODEL_CACHE_DIR } from '@shared/constants/embedding'
import { logger } from '@shared/services/logger'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

export async function withModelAutoDelete<T>(modelName: string, loader: () => Promise<T>): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    const dir = join(MODEL_CACHE_DIR, modelName)
    logger.warn({ error, dir }, `Model load failed — deleting cache dir and rethrowing`)
    try {
      rmSync(dir, { recursive: true, force: true })
      logger.info(`Deleted corrupted model cache: ${dir}`)
      return await loader()
    } catch (rmError) {
      logger.error({ rmError }, `Failed to delete model cache dir`)
    }
    throw error
  }
}