import express from 'express'
import { faceDeletionQueue, faceLabellingQueue, faceRenameQueue } from '../queue'
import { FaceDeletionSchema, FaceLabellingSchema, FaceRenameSchema } from 'src/schemas/face'
import { logger } from '@shared/services/logger'

const router = express.Router()

router.patch('/', async (req, res) => {
  const form = FaceLabellingSchema.safeParse(req.body)

  if (!form.success) {
    logger.debug(form.error)
    return res.status(400).json({ error: JSON.stringify(form.error, null, 2) })
  }

  const { name, faces } = form.data

  try {
    await faceLabellingQueue.add('face-labelling', {
      faces,
      name,
    })

    res.json({
      message: 'Face deletion job queued',
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to queue face deletion job' })
  }
})

router.post('/:name/rename', async (req, res) => {
  const { name } = req.params
  const form = FaceRenameSchema.safeParse(req.body)

  if (!form.success) {
    logger.debug(form.error)
    return res.status(400).json({ error: JSON.stringify(form.error, null, 2) })
  }

  const { newName } = form.data

  try {
    await faceRenameQueue.add('face-renaming', {
      newName,
      oldName: name,
    })

    res.json({
      message: 'Face deletion job queued',
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to queue face deletion job' })
  }
})

router.delete('/', async (req, res) => {
  const form = FaceDeletionSchema.safeParse(req.body)

  if (!form.success) {
    return res.status(400).json({ error: 'jsonFile or imageFile are required' })
  }

  const { imageFile, jsonFile } = form.data

  try {
    await faceDeletionQueue.add('face-deletion', {
      imageFile,
      jsonFile,
    })

    res.json({
      message: 'Face deletion job queued',
    })
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to queue face deletion job' })
  }
})

router.get('/processing', async (req, res) => {
  try {
    const [labellingJobs, deletionJobs] = await Promise.all([
      faceLabellingQueue.getActive(),
      faceDeletionQueue.getActive(),
      faceLabellingQueue.getWaiting(),
      faceDeletionQueue.getWaiting(),
    ])

    const processingFaces = [
      ...labellingJobs
        .flatMap((job) => job.data.faces)
        .map((face) => ({
          type: 'labelling',
          jsonFile: face.jsonFile,
        })),
      ...deletionJobs.map((job) => ({
        type: 'deletion',
        jsonFile: job.data.jsonFile,
      })),
    ]

    res.json(processingFaces)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: 'Failed to fetch processing faces' })
  }
})

export default router
