import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ForgotPasswordLink() {
  const { t } = useTranslation()

  return (
    <div className="flex justify-end">
      <Link
        to="/auth/forgot-password"
        className="text-[14px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
      >
        {t('auth.forgotPassword')}
      </Link>
    </div>
  )
}
