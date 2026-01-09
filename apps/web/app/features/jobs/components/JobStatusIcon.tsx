import type { Job } from '@prisma/client'
import { ArrowPathIcon, CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'

export const JobStatusIcon = ({ status }: { status: Job['status'] }) => {
  switch (status) {
    case 'done':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />
    case 'error':
      return <XMarkIcon className="w-5 h-5 text-red-500" />
    case 'pending':
      return <ClockIcon className="w-5 h-5 text-white/40" />
    case 'processing':
      return <ArrowPathIcon className="w-5 h-5 text-white animate-spin" />
    default:
      return null
  }
}
