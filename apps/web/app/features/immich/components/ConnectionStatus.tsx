import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import type { ImmichConnectionStatus } from '../types'

export function ConnectionStatus({ status }: { status?: ImmichConnectionStatus }) {
  if (!status?.message) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-xl border ${
        status.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      <div className="flex items-center gap-2">
        {status.success ? (
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
        ) : (
          <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
        )}
        <p className={`text-sm font-medium ${status.success ? 'text-green-400' : 'text-red-400'}`}>{status.message}</p>
      </div>
    </motion.div>
  )
}
