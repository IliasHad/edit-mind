import { z } from 'zod'

const envSchema = z.object({
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  WEB_APP_URL: z.string().min(1, 'WEB_APP_URL is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, {
      message: 'REDIS_PORT must be a valid number',
    }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BACKGROUND_JOBS_PORT: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, {
      message: 'BACKGROUND_JOBS_PORT must be a valid number',
    }),
  MAX_CONCURRENT_VIDEO_JOBS: z
    .string()
    .default("1")
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0, {
      message: 'MAX_CONCURRENT_VIDEO_JOBS must be a valid number',
    }),
})

export const env = envSchema.parse(process.env)
