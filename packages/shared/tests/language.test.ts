import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, isSupportedLanguage, SUPPORTED_LANGUAGES } from '@shared/types/language'

describe('language types', () => {
  it('supports exactly English and Russian with English as default', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ru'])
    expect(DEFAULT_LANGUAGE).toBe('en')
  })

  it('validates supported language values', () => {
    expect(isSupportedLanguage('en')).toBe(true)
    expect(isSupportedLanguage('ru')).toBe(true)
    expect(isSupportedLanguage('fr')).toBe(false)
    expect(isSupportedLanguage(undefined)).toBe(false)
  })
})
