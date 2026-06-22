import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '@shared/types/language'
import { SUPPORTED_LANGUAGES } from '@shared/types/language'
import { i18next, setI18nLanguage } from '~/i18n'

interface LanguageSelectorProps {
  initialLanguage?: AppLanguage
}

export function LanguageSelector({ initialLanguage }: LanguageSelectorProps) {
  const { t } = useTranslation()
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage ?? (i18next.resolvedLanguage as AppLanguage) ?? 'en')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value as AppLanguage
    const previousLanguage = language

    setLanguage(nextLanguage)
    setI18nLanguage(nextLanguage)
    setStatus('saving')

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: nextLanguage }),
      })

      if (!response.ok) {
        throw new Error('Failed to update language')
      }

      setStatus('saved')
    } catch (error) {
      console.error(error)
      setLanguage(previousLanguage)
      setI18nLanguage(previousLanguage)
      setStatus('error')
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-black">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black dark:text-white">{t('settings.preferences.language.title')}</h3>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          {t('settings.preferences.language.description')}
        </p>
      </div>

      <label className="block text-sm font-medium text-black/70 dark:text-white/70" htmlFor="app-language">
        {t('settings.preferences.language.label')}
      </label>
      <select
        id="app-language"
        value={language}
        onChange={handleChange}
        disabled={status === 'saving'}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-black shadow-sm outline-none transition focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30"
      >
        {SUPPORTED_LANGUAGES.map((supportedLanguage) => (
          <option key={supportedLanguage} value={supportedLanguage}>
            {t(`settings.preferences.language.${supportedLanguage}`)}
          </option>
        ))}
      </select>

      <p className="mt-3 text-sm text-black/50 dark:text-white/50" role="status">
        {status === 'saving' && t('common.saving')}
        {status === 'saved' && t('settings.preferences.language.saved')}
        {status === 'error' && t('settings.preferences.language.error')}
      </p>
    </div>
  )
}
