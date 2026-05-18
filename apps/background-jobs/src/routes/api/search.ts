import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { logger } from '@shared/services/logger'
import { requireScopes } from '@background-jobs/middleware/accessTokenAuth'
import { sanitizeForJson } from '@background-jobs/utils/serialize'
import { searchScenes } from '@search/services'

const router = Router()

const SearchRequestSchema = VideoSearchParamsSchema.extend({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).default(0),
})

router.post('/', requireScopes('videos_read'), async (req: Request, res: Response) => {
  try {
    const parsed = SearchRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
      return
    }

    const { query, offset, ...searchParams } = parsed.data

    const results = await searchScenes(
      { ...searchParams, semanticQuery: query ?? searchParams.semanticQuery },
      searchParams.limit + offset,
      true,
    )

    const total = results.length
    const videos = results.slice(offset, offset + searchParams.limit)
    const hasMore = offset + videos.length < total
    const totalPages = Math.ceil(total / searchParams.limit)

    res.json(sanitizeForJson({ videos, total, limit: searchParams.limit, offset, hasMore, totalPages }))
  } catch (error) {
    logger.error({ error }, 'Failed to search video scenes')
    res.status(500).json({ error: 'Failed to search videos' })
  }
})

export default router
