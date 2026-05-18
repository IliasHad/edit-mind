import { Router } from 'express'
import videosRoute from './videos'
import searchRoute from './search'
import suggestionsRoute from './suggestions'
import mediaRoute from './media'
import collectionsRoute from './collections'

const router = Router()

router.use('/videos', videosRoute)
router.use('/search', searchRoute)
router.use('/suggestions', suggestionsRoute)
router.use('/media', mediaRoute)
router.use('/collections', collectionsRoute)

export default router
