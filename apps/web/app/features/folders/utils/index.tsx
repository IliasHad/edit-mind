import type { FolderStatus } from '@prisma/client'

export const getStatusInfo = (status: FolderStatus) => {
  switch (status) {
    case 'scanning':
      return {
        textKey: 'folders.status.scanning',
        color: 'text-blue-600 dark:text-blue-400',
      }
    case 'indexed':
      return {
        textKey: 'folders.status.indexed',
        color: 'text-green-600 dark:text-green-400',
      }
    case 'error':
      return {
        textKey: 'folders.status.error',
        color: 'text-red-600 dark:text-red-400',
      }
    default:
      return {
        textKey: 'folders.status.idle',
        color: 'text-black/50 dark:text-white/50',
      }
  }
}
