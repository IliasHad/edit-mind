import { z } from 'zod'

export const VideoReIndexingSchema = z.object({
  videoPath: z.string().min(1, 'videoPath cannot be empty'),
  forceReIndexing: z.boolean().default(false),
  priority: z.number().min(0).default(0),
  jobId: z.string().min(1, 'jobId cannot be empty'),
})
