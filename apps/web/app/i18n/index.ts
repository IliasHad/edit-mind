import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE } from '@shared/types/language'
import { i18nConfig, resolveLanguage } from './config'

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    ...i18nConfig,
    lng: DEFAULT_LANGUAGE,
  })
}

export function setI18nLanguage(language: unknown) {
  const resolvedLanguage = resolveLanguage(language)

  if (i18next.language !== resolvedLanguage) {
    void i18next.changeLanguage(resolvedLanguage)
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = resolvedLanguage
  }

  return resolvedLanguage
}

export { i18next }
export { resolveLanguage }
export type { AppLanguage } from '@shared/types/language'
