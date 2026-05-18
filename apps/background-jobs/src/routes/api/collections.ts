import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { CollectionModel } from '@db/models/Collection'
import { CollectionItemModel } from '@db/models/CollectionItem'
import { logger } from '@shared/services/logger'
import { requireScopes } from '@background-jobs/middleware/accessTokenAuth'
import { sanitizeForJson } from '@background-jobs/utils/serialize'
import { CollectionType } from '@prisma/client'

const router = Router()

const QuerySchema = z.object({
  type: z.union([z.nativeEnum(CollectionType), z.literal('all')]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
})

router.get('/', requireScopes('collections_read'), async (req: Request, res: Response) => {
  try {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() })
      return
    }

    const { type, limit, offset } = parsed.data
    const whereType = type && type !== 'all' ? type : undefined
    const where = {
      userId: req.userId,
      ...(whereType && { type: whereType }),
    }

    const [collections, total] = await Promise.all([
      CollectionModel.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      CollectionModel.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)
    const hasMore = offset + collections.length < total

    res.json(sanitizeForJson({ collections, total, limit, offset, hasMore, totalPages }))
  } catch (error) {
    logger.error({ error }, 'Failed to list collections')
    res.status(500).json({ error: 'Failed to list collections' })
  }
})

router.get('/:id', requireScopes('collections_read'), async (req: Request, res: Response) => {
  try {
    const collection = await CollectionModel.findById(req.params.id as string)

    if (!collection || collection.userId !== req.userId) {
      res.status(404).json({ error: 'Collection not found' })
      return
    }

    const items = await CollectionItemModel.findManyAndVideos(collection.id)

    res.json(sanitizeForJson({ collection, items }))
  } catch (error) {
    logger.error({ error }, 'Failed to get collection')
    res.status(500).json({ error: 'Failed to get collection' })
  }
})

export default router
