import { useServices } from '~/features/services/hooks/useServices'

interface ServicesStatusProps {
  isCollapsed?: boolean
}

export function ServicesStatus({ isCollapsed = false }: ServicesStatusProps) {
  const { status } = useServices()

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex items-center justify-between py-1.5">
          <div className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
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
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-700 dark:text-gray-300">Background Jobs</span>
          <div className={`w-2 h-2 rounded-full ${status?.backgroundJobsService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-700 dark:text-gray-300">ML Service</span>
          <div className={`w-2 h-2 rounded-full ${status?.mlService ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>
    </div>
  )
}
