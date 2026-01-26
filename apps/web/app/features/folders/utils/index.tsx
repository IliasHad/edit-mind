import type { FolderStatus } from '@prisma/client'

export const getStatusInfo = (status: FolderStatus) => {
  switch (status) {
    case 'scanning':
      return {
        text: 'Scanning...',
        color: 'text-blue-600 dark:text-blue-400',
      }
    case 'indexed':
      return {
        text: 'Indexed',
        color: 'text-green-600 dark:text-green-400',
      }
    case 'error':
      return {
        text: 'Error',
        color: 'text-red-600 dark:text-red-400',
      }
    default:
      return {
        text: 'Idle',
        color: 'text-black/50 dark:text-white/50',
      }
  }
}
