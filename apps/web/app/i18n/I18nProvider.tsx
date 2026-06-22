import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import type { AppLanguage } from '@shared/types/language'
import { i18next, setI18nLanguage } from './index'

interface I18nProviderProps {
  children: ReactNode
  language?: AppLanguage
}

export function I18nProvider({ children, language }: I18nProviderProps) {
  const resolvedLanguage = setI18nLanguage(language)

  useEffect(() => {
    setI18nLanguage(resolvedLanguage)
  }, [resolvedLanguage])

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}
