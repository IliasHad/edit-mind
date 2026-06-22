import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCacheMock = vi.hoisted(() => vi.fn())
const setCacheMock = vi.hoisted(() => vi.fn())
const invalidateCacheMock = vi.hoisted(() => vi.fn())
const getScenesStreamMock = vi.hoisted(() => vi.fn())

vi.mock('@shared/services/cache', () => ({
  getCache: getCacheMock,
  invalidateCache: invalidateCacheMock,
  setCache: setCacheMock,
}))

vi.mock('@shared/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@vector/services/db', () => ({
  getScenesStream: getScenesStreamMock,
}))

import { VideoSearchParamsSchema } from '@shared/schemas/search'
import {
  buildSearchQueryFromSuggestions,
  cleanSuggestionWord,
  getSearchSuggestions,
  getSuggestionPrefixes,
  refreshSuggestionCache,
} from '../src/services/suggestion'
import { applyFilters } from '../src/utils/filters'

beforeEach(() => {
  getCacheMock.mockReset()
  setCacheMock.mockReset()
  invalidateCacheMock.mockReset()
  getScenesStreamMock.mockReset()
})

describe('getSuggestionPrefixes', () => {
  it('indexes Cyrillic prefixes for Russian words', () => {
    expect(getSuggestionPrefixes('собака')).toEqual(expect.arrayContaining(['со', 'соб']))
  })

  it('normalizes uppercase Cyrillic words to lowercase prefixes', () => {
    expect(getSuggestionPrefixes('Москва')).toEqual(expect.arrayContaining(['мо']))
  })

  it('keeps English prefix suggestions working', () => {
    expect(getSuggestionPrefixes('hello')).toEqual(expect.arrayContaining(['he']))
  })

  it('removes punctuation and emoji before generating Cyrillic prefixes', () => {
    expect(getSuggestionPrefixes('собака!')).toEqual(expect.arrayContaining(['со', 'соб']))
    expect(getSuggestionPrefixes('🐶собака')).toEqual(expect.arrayContaining(['со', 'соб']))
  })

  it('normalizes dirty lookup queries the same way indexed prefixes are normalized', () => {
    expect(cleanSuggestionWord('🐶собака!')).toBe('собака')
    expect(getSuggestionPrefixes('🐶собака!')).toEqual(expect.arrayContaining(['со', 'соб', 'соба']))
  })
})

describe('getSearchSuggestions', () => {
  it('looks up dirty Cyrillic queries by the cleaned Unicode-aware prefix key', async () => {
    const canonicalSuggestion = {
      text: 'dog',
      displayText: 'собака',
      value: 'dog',
      type: 'object' as const,
      count: 10,
      sceneCount: 3,
    }
    getCacheMock.mockImplementation(async (key: string) => {
      if (key === 'search:suggestions:v1:собака') {
        return [canonicalSuggestion]
      }
      return []
    })

    const result = await getSearchSuggestions('🐶собака!', 5)

    expect(getCacheMock).toHaveBeenCalledWith('search:suggestions:v1:собака')
    expect(result).toEqual([{ ...canonicalSuggestion, text: 'собака' }])
  })

  it('deduplicates localized and canonical suggestions by canonical value', async () => {
    const canonicalSuggestion = { text: 'dog', type: 'object' as const, count: 10, sceneCount: 3 }
    const localizedSuggestion = {
      text: 'собака',
      displayText: 'собака',
      value: 'dog',
      type: 'object' as const,
      count: 9,
      sceneCount: 3,
    }
    getCacheMock.mockImplementation(async (key: string) => {
      if (key === 'search:suggestions:v1:со') {
        return [localizedSuggestion, canonicalSuggestion]
      }
      return []
    })

    const result = await getSearchSuggestions('со', 5)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ value: 'dog', text: 'собака' })
  })

  it('indexes localized Russian prefixes for known canonical metadata suggestions', async () => {
    async function* scenes() {
      yield {
        objects: ['dog'],
        faces: [],
        emotions: [],
        camera: 'Canon',
        location: 'Moscow',
        shotType: 'long-shot',
        transcription: '',
        detectedText: '',
      }
      yield {
        objects: ['dog'],
        faces: [],
        emotions: [],
        camera: 'Canon',
        location: 'Moscow',
        shotType: 'long-shot',
        transcription: '',
        detectedText: '',
      }
    }

    getScenesStreamMock.mockReturnValue(scenes())

    await refreshSuggestionCache()

    expect(setCacheMock).toHaveBeenCalledWith(
      'search:suggestions:v1:со',
      expect.arrayContaining([
        expect.objectContaining({ text: 'собака', value: 'dog', displayText: 'собака', type: 'object' }),
      ]),
      expect.any(Number)
    )
  })
})

describe('buildSearchQueryFromSuggestions', () => {
  it('splits comma-separated multi-value suggestion filters into canonical arrays', () => {
    const result = buildSearchQueryFromSuggestions({
      object: 'dog,cat',
      emotion: 'happy,sad',
      face: 'Alice,Bob',
      location: 'Moscow,Krasnodar',
    })

    expect(result.objects).toEqual(['dog', 'cat'])
    expect(result.emotions).toEqual(['happy', 'sad'])
    expect(result.faces).toEqual(['Alice', 'Bob'])
    expect(result.locations).toEqual(['Moscow', 'Krasnodar'])
  })

  it('keeps only the first shot type from comma-separated suggestion values', () => {
    const result = buildSearchQueryFromSuggestions({ shotType: 'close-up,long-shot' })

    expect(result.shotType).toBe('close-up')
  })
})

describe('applyFilters', () => {
  it('uses individual canonical values for multi-value filters', () => {
    const query = VideoSearchParamsSchema.parse({
      objects: ['dog', 'cat'],
      emotions: ['happy', 'sad'],
      faces: ['Alice', 'Bob'],
      locations: ['Moscow', 'Krasnodar'],
      shotType: 'close-up',
    })

    const { where, whereDocument } = applyFilters(query)

    expect(where).toEqual({
      $and: expect.arrayContaining([
        { objects: { $in: ['dog', 'cat'] } },
        { faces: { $in: ['Alice', 'Bob'] } },
        { location: { $in: ['Moscow', 'Krasnodar'] } },
        { shotType: 'close-up' },
      ]),
    })
    expect(whereDocument).toEqual({
      $and: expect.arrayContaining([{ $contains: 'happy' }, { $contains: 'sad' }]),
    })
  })
})
