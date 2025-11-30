import * as path from 'path'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.resolve('../../.env.testing') })
} else {
  dotenv.config({})
}

export const REMOTION_ROOT = process.env.REMOTION_ROOT
export const REMOTION_OUTPUT_VIDEOS = process.env.REMOTION_OUTPUT_VIDEOS
export const REMOTION_COMPOSITION_ID = 'YearInReview'
