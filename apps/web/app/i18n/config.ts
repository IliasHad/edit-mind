import type { AppLanguage } from '@shared/types/language'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@shared/types/language'
import en from './resources/en'
import ru from './resources/ru'

export const I18N_NAMESPACE = 'translation'

export const resources = {
  en: { [I18N_NAMESPACE]: en },
  ru: { [I18N_NAMESPACE]: ru },
} as const

export const i18nConfig = {
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  resources,
  ns: [I18N_NAMESPACE],
  defaultNS: I18N_NAMESPACE,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
} as const

export function resolveLanguage(language: unknown): AppLanguage {
  return SUPPORTED_LANGUAGES.includes(language as AppLanguage) ? (language as AppLanguage) : DEFAULT_LANGUAGE
}
