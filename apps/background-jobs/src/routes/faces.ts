import express from 'express'
import { faceDeletionQueue, faceLabellingQueue, faceRenameQueue } from '@background-jobs/queue'
import { FaceDeletionSchema, FaceLabellingSchema, FaceRenameSchema } from '../schemas/face'
import { logger } from '@shared/services/logger'
import { FaceDeletionJobData, FaceLabellingJobData } from '@shared/types/face'
import type { Job } from 'bullmq'

const router = express.Router()

router.patch('/', async (req, res) => {
  const form = FaceLabellingSchema.safeParse(req.body)

  if (!form.success) {
    logger.debug(form.error)
    return res.status(400).json({ error: form.error.format() })
  }

  const { name, faces } = form.data

  try {
    await faceLabellingQueue.add('face-labelling', { name, faces })
    res.json({ message: 'Face labelling job queued' })
  } catch (error) {
    logger.error(error)
    return res.status(500).json({ error: 'Failed to queue face labelling job' })
  }
})

router.post('/:name/rename', async (req, res) => {
  const form = FaceRenameSchema.safeParse(req.body)

  if (!form.success) {
    logger.debug(form.error)
    return res.status(400).json({ error: form.error.format() })
  }

  try {
    await faceRenameQueue.add('face-renaming', {
      oldName: req.params.name,
      newName: form.data.newName,
    })

    res.json({ message: 'Face renaming job queued' })
  } catch (error) {
    logger.error(error)
    return res.status(500).json({ error: 'Failed to queue face renaming job' })
  }
})

router.delete('/', async (req, res) => {
  const form = FaceDeletionSchema.safeParse(req.body)

  if (!form.success) {
    return res.status(400).json({ error: 'jsonFile and imageFile are required' })
  }
  try {
    await faceDeletionQueue.add('face-deletion', form.data)
    res.json({ message: 'Face deletion job queued' })
  } catch (error) {
    logger.error(error)
    return res.status(500).json({ error: 'Failed to queue face deletion job' })
  }
})

/**
 * Get all processing (non-completed, non-failed) face jobs
 * GET /internal/faces/processing
 *
 * @returns Array of jobs with their current status
 */
router.get('/processing', async (_req, res) => {
  try {
    const [labellingActive, labellingWaiting, labellingDelayed, deletionActive, deletionWaiting, deletionDelayed] =
      await Promise.all([
        faceLabellingQueue.getActive(),
        faceLabellingQueue.getWaiting(),
        faceLabellingQueue.getDelayed(),
        faceDeletionQueue.getActive(),
        faceDeletionQueue.getWaiting(),
        faceDeletionQueue.getDelayed(),
      ])

    const labellingJobs = [...labellingActive, ...labellingWaiting, ...labellingDelayed].flatMap(
      (job: Job<FaceLabellingJobData>) =>
        job.data.faces.map((face) => ({
          queue: 'face-labelling',
          jobId: job.id,
          status: job.finishedOn ? 'completed' : job.processedOn ? 'active' : 'waiting',
          jsonFile: face.jsonFile,
        }))
    )

    const deletionJobs = [...deletionActive, ...deletionWaiting, ...deletionDelayed].map(
      (job: Job<FaceDeletionJobData>) => ({
        queue: 'face-deletion',
        jobId: job.id,
        status: job.finishedOn ? 'completed' : job.processedOn ? 'active' : 'waiting',
        jsonFile: job.data.jsonFile,
      })
    )

    res.json([...labellingJobs, ...deletionJobs])
  } catch (error) {
    logger.error(error)
    return res.status(500).json({ error: 'Failed to fetch processing faces' })
  }
})

export default router
