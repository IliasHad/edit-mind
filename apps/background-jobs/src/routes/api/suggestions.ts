import { Router, Request, Response } from 'express'
import { logger } from '@shared/services/logger'
import { requireScopes } from '@background-jobs/middleware/accessTokenAuth'
import { getGroupedSearchSuggestions, getPopularSuggestions } from '@search/services/suggestion'

const router = Router()

router.get('/', requireScopes('videos_read'), async (req: Request, res: Response) => {
  try {
    const rawQ = req.query.q
    const query = typeof rawQ === 'string' ? rawQ.trim() : undefined

    if (query && query.length > 100) {
      res.status(400).json({ error: 'Query too long', message: 'q must be 100 characters or fewer' })
      return
    }

    if (!query || query.length < 2) {
      const suggestions = await getPopularSuggestions(20)
      res.json({ suggestions })
      return
    }

    const grouped = await getGroupedSearchSuggestions(query)
    const suggestions = Object.values(grouped).flat()

    res.json({ suggestions })
  } catch (error) {
    logger.warn({ error }, 'Failed to get suggestions')
    res.status(500).json({ error: 'Failed to get suggestions' })
  }
})

export default router
