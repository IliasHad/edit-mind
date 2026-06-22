export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: AppLanguage = 'en'

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as AppLanguage)
}
