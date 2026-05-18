import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { VideoModel } from '@db/models/Video'
import { logger } from '@shared/services/logger'
import { requireScopes } from '@background-jobs/middleware/accessTokenAuth'
import { getByVideoSource } from '@vector/services/db'
import { sanitizeForJson } from '@background-jobs/utils/serialize'

const router = Router()

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
})

router.get('/', requireScopes('videos_read'), async (req: Request, res: Response) => {
  try {
    const parsed = PaginationSchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() })
      return
    }

    const { limit, offset } = parsed.data
    const where = { userId: req.userId }

    const [videos, total] = await Promise.all([
      VideoModel.findMany({ where, orderBy: { importAt: 'desc' }, take: limit, skip: offset }),
      VideoModel.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)
    const hasMore = offset + videos.length < total

    res.json(sanitizeForJson({ videos, total, limit, offset, hasMore, totalPages }))
  } catch (error) {
    logger.error({ error }, 'Failed to list videos')
    res.status(500).json({ error: 'Failed to list videos' })
  }
})

router.get('/:id', requireScopes('videos_read'), async (req: Request, res: Response) => {
  try {
    const video = await VideoModel.findById(req.params.id as string)

    if (!video || video.userId !== req.userId) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    const videoWithScenes = await getByVideoSource(video.source)

    res.json(sanitizeForJson({ video, scenes: videoWithScenes?.scenes || [] }))
  } catch (error) {
    logger.error({ error }, 'Failed to get video')
    res.status(500).json({ error: 'Failed to get video' })
  }
})

export default router
