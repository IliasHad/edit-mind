import { useRouteLoaderData } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '@shared/types/language'
import { LanguageSelector } from './LanguageSelector'

interface RootLoaderData {
  language?: AppLanguage
}

export function PreferencesSettings() {
  const { t } = useTranslation()
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black dark:text-white">{t('settings.preferences.title')}</h2>
        <p className="text-sm text-black/50 dark:text-white/50">{t('settings.preferences.description')}</p>
      </div>

      <LanguageSelector initialLanguage={rootData?.language} />
    </section>
  )
}
