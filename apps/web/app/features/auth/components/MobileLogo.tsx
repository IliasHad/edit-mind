import { useTranslation } from 'react-i18next'

export function MobileLogo() {
  const { t } = useTranslation()

  return (
    <div className="lg:hidden mb-8 flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
        <span className="text-2xl">🎬</span>
      </div>
      <span className="text-xl font-semibold text-black dark:text-white">{t('common.appName')}</span>
    </div>
  )
}
