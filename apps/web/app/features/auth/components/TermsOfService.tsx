import { useTranslation } from 'react-i18next'

export function TermsOfService() {
  const { t } = useTranslation()
  return (
    <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
      {t('auth.terms.prefix')}{' '}
      <a href="#" className="underline hover:text-gray-600 dark:hover:text-gray-300">
        {t('auth.terms.terms')}
      </a>{' '}
      {t('auth.terms.and')}{' '}
      <a href="#" className="underline hover:text-gray-600 dark:hover:text-gray-300">
        {t('auth.terms.privacy')}
      </a>
    </p>
  )
}
