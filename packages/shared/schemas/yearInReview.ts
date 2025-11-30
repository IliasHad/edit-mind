import { z } from 'zod'

export const YearInReviewSlideSchema = z.object({
  type: z.enum([
    'hero',
    'openingScene',
    'scenes',
    'categories',
    'objects',
    'objectStory',
    'faces',
    'funFacts',
    'weekendPersonality',
    'weekdayEnergy',
    'locations',
    'colorTemperature',
    'moodboard',
    'yourCreativeDNA',
    'vibeScore',
    'rareGems',
    'mostSpokenWords',
    'snapshotOfTheYear',
    'closingScene',
    'share'
  ]),
  title: z.string(),
  content: z.string(),
  interactiveElements: z.string(),
})

export const Objects = z.object({
  name: z.string(),
  count: z.number(),
})

export const Face = z.object({
  name: z.string(),
  count: z.number(),
})

export const Emotion = z.object({
  emotion: z.string(),
  count: z.number(),
})

export const Location = z.object({
  name: z.string(),
  count: z.number(),
})

export const TopSceneSchema = z.object({
  videoSource: z.string(),
  thumbnailUrl: z.string(),
  duration: z.number(),
  description: z.string().optional(),
  faces: z.array(z.string()),
  emotions: z.array(z.string()),
  objects: z.array(z.string()),
  location: z.string().optional(),
  dateDisplay: z.string().optional(),
})

export const YearInReviewDataSchema = z.object({
  slides: z.array(YearInReviewSlideSchema),
  topScenes: z.array(TopSceneSchema).optional(),
  topObjects: z.array(Objects),
  topFaces: z.array(Face),
  topEmotions: z.array(Emotion),
  topLocations: z.array(Location),
  mostSpokenWords: z.array(z.string())
})

export const YearInReviewVideoSchema = z.object({
  data: YearInReviewDataSchema,
  year: z.number(),
});

export type YearInReviewObject = z.infer<typeof Objects>
export type YearInReviewFace = z.infer<typeof Face>
export type YearInReviewEmotion = z.infer<typeof Emotion>
export type YearInReviewLocation = z.infer<typeof Location>
export type YearInReviewSlide = z.infer<typeof YearInReviewSlideSchema>
export type TopScene = z.infer<typeof TopSceneSchema>
export type YearInReviewData = z.infer<typeof YearInReviewDataSchema>
export type YearInReviewVideo = z.infer<typeof YearInReviewVideoSchema>