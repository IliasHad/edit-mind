import { z } from 'zod'

export const VideoReIndexingSchema = z.object({
  videoPath: z.string().min(1, 'videoPath cannot be empty'),
  forceReIndexing: z.boolean().default(false),
  priority: z.number().min(0).default(0),
  jobId: z.string().min(1, 'jobId cannot be empty'),
})

export const VideoUpdateSchema = z.object({
  source: z.string().min(1, 'source cannot be empty'),
  metadata: z.union([
    z.array(z.record(z.string(), z.string())),
    z.object({
      labels: z.array(z.object({
        name: z.string(),
        value: z.string()
      }))
    })
  ])
})