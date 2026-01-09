import { z } from 'zod'

const envSchema = z.object({
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  BACKGROUND_JOBS_URL: z.string().min(1, 'BACKGROUND_JOBS_URL is required'),
})

export const env = envSchema.parse(process.env)
