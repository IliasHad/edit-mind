import { describe, expect, it } from 'vitest'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import {
  getSuggestionFilterValue,
  localizeCanonicalSuggestion,
  normalizeLocalizedSearchQuery,
} from '../src/utils/localizedQuery'

const createSearchParams = (semanticQuery: string) =>
  VideoSearchParamsSchema.parse({
    semanticQuery,
  })

describe('normalizeLocalizedSearchQuery', () => {
  it('adds canonical object filters for inflected Russian object terms without changing semantic query', () => {
    const result = normalizeLocalizedSearchQuery(createSearchParams('собаку у дверью'), 'ru')

    expect(result.objects).toEqual(expect.arrayContaining(['dog', 'door']))
    expect(result.semanticQuery).toBe('собаку у дверью')
  })

  it('adds canonical shot type, emotion, and object metadata from inflected Russian terms without changing semantic query', () => {
    const result = normalizeLocalizedSearchQuery(createSearchParams('крупным планом счастливые люди'), 'ru')

    expect(result.shotType).toBe('close-up')
    expect(result.emotions).toContain('happy')
    expect(result.objects).toContain('person')
    expect(result.semanticQuery).toBe('крупным планом счастливые люди')
  })

  it('localizes canonical metadata suggestions while preserving canonical value', () => {
    expect(localizeCanonicalSuggestion({ text: 'dog', type: 'object', count: 2, sceneCount: 2 }, 'ru')).toMatchObject({
      text: 'собака',
      value: 'dog',
    })
    expect(localizeCanonicalSuggestion({ text: 'happy', type: 'emotion', count: 2, sceneCount: 2 }, 'ru')).toMatchObject({
      text: 'счастливый',
      value: 'happy',
    })
    expect(localizeCanonicalSuggestion({ text: 'close-up', type: 'shotType', count: 2, sceneCount: 2 }, 'ru')).toMatchObject({
      text: 'крупный план',
      value: 'close-up',
    })
  })

  it('uses canonical suggestion value for filters when present', () => {
    expect(getSuggestionFilterValue({ text: 'собака', value: 'dog' })).toBe('dog')
    expect(getSuggestionFilterValue({ text: 'dog' })).toBe('dog')
  })
})
