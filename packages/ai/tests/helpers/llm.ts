import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { logger } from '@shared/services/logger'
import { AspectRatio, ShotType } from '@shared/types'
import { VideoSearchParams } from '@shared/types/search'
import { expect } from 'vitest'

export const TEST_QUERIES = {
  simple: {
    query: 'Create a 30 second vertical video of me looking happy',
    expected: {
      emotions: expect.arrayContaining(['happy']),
      aspect_ratio: '9:16' as AspectRatio,
      duration: 30,
    },
  },
  complex: {
    query: "Find all close-ups where @Ilias is surprised and there's a laptop",
    expected: {
      emotions: expect.arrayContaining(['surprised']),
      shot_type: 'close-up' as ShotType,
      objects: expect.arrayContaining(['laptop']),
      faces: expect.arrayContaining(['ilias']),
    },
  },
  transcription: {
    query: "Show me clips where I say 'machine learning is awesome'",
    expected: {
      transcriptionQuery: expect.stringMatching(/machine learning/i),
    },
  },
  withObjects: {
    query: '2 minute video of cooking with pans and knives',
    expected: {
      action: expect.stringMatching(/cook/i),
      duration: 120,
      objects: expect.arrayContaining([expect.stringMatching(/pan|knife/i)]),
    },
  },
  multiEmotion: {
    query: 'Compile happy and excited moments from last summer',
    expected: {
      emotions: expect.arrayContaining(['happy', 'excited']),
    },
  },
  aspectRatio: {
    query: 'Make a square Instagram post of my dog',
    expected: {
      aspect_ratio: '1:1' as AspectRatio,
      objects: expect.arrayContaining([expect.stringMatching(/dog/i)]),
    },
  },
  shotType: {
    query: 'Give me all medium shots videos',
    expected: {
      shot_type: 'medium-shot' as ShotType,
    },
  },
}

export function compareResults(result: VideoSearchParams, expected: Partial<VideoSearchParams>): void {
  const validated = VideoSearchParamsSchema.safeParse(result)

  if (!validated.success) {
    logger.error('Schema validation failed: ' + validated.error)
  }

  expect(validated.success).toBe(true)

  Object.entries(expected).forEach(([key, expectedValue]) => {
    const actualValue = result[key as keyof VideoSearchParams]

    if (expectedValue && typeof expectedValue === 'object' && 'asymmetricMatch' in expectedValue) {
      expect(actualValue).toEqual(expectedValue)
    } else {
      expect(actualValue).toEqual(expectedValue)
    }
  })
}
