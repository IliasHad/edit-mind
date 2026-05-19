import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BACKGROUND_JOBS_URL } from '~/features/services/constants'
import { useServices } from '~/features/services/hooks/useServices'

interface ServicesStatusProps {
  isCollapsed?: boolean
}

export function ServicesStatus({ isCollapsed = false }: ServicesStatusProps) {
  const { status } = useServices()
  const { t } = useTranslation()
  const backgroundJobsHref = BACKGROUND_JOBS_URL

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex items-center justify-between py-1.5">
          <Link to={backgroundJobsHref} target='_blank' className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1 px-3">
        <Link to={backgroundJobsHref} target='_blank' className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('shell.services.backgroundJobs')}</span>
          <div className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </Link>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('shell.services.mlService')}</span>
          <div className={`w-2 h-2 rounded-full ${status?.mlService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>
    </div>
  )
}
