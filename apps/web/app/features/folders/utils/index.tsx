import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import type { FolderStatus } from '@prisma/client'

export const getStatusInfo = (status: FolderStatus) => {
  switch (status) {
    case 'scanning':
      return {
        icon: <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />,
        text: 'Scanning...',
        color: 'text-blue-600 dark:text-blue-400',
      }
    case 'indexed':
      return {
        icon: <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />,
        text: 'Indexed',
        color: 'text-green-600 dark:text-green-400',
      }
    case 'error':
      return {
        icon: <ExclamationCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />,
        text: 'Error',
        color: 'text-red-600 dark:text-red-400',
      }
    default:
      return {
        icon: null,
        text: 'Idle',
        color: 'text-black/50 dark:text-white/50',
      }
  }
}
