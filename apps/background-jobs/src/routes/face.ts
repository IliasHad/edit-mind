import express from 'express'
import { faceLabellingQueue } from '../queue'
import { FaceLabellingJobData } from '@shared/types/face'

const router = express.Router()

router.post('/label', async (req, res) => {
  const { faces, name } = req.body as FaceLabellingJobData

  if (!faces) {
    return res.status(400).json({ error: 'faces is required' })
  }

  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  try {
    await faceLabellingQueue.add(
      'face-labelling',
      {
        faces,
        name,
      },
      {
        removeOnComplete: true,
      }
    )

    res.json({
      message: 'Face labelling job queued',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to queue face labelling job' })
  }
})

export default router
