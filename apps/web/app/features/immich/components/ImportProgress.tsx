import { motion, AnimatePresence } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import type { ImmichImportStatus } from '@immich/types/immich'

interface ImportProgressProps {
  importStatus: ImmichImportStatus
  onRetry?: () => void
}

export function ImportProgress({ importStatus, onRetry }: ImportProgressProps) {
  const getStatusConfig = () => {
    switch (importStatus.status) {
      case 'importing':
        return {
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          textColor: 'text-blue-400',
          progressColor: 'bg-blue-400',
          title: 'Importing faces...',
        }
      case 'completed':
        return {
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-400',
          progressColor: 'bg-green-400',
          title: 'Import completed',
        }
      case 'failed':
        return {
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-400',
          progressColor: 'bg-red-400',
          title: 'Import failed',
        }
      default:
        return {
          bgColor: 'bg-white/5',
          borderColor: 'border-white/10',
          textColor: 'text-white/60',
          progressColor: 'bg-white/20',
          title: 'Ready to import',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`rounded-2xl my-8 border ${config.borderColor} ${config.bgColor} backdrop-blur-sm overflow-hidden`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${config.textColor}`}>{config.title}</span>
            </div>
            <span className={`text-sm font-semibold ${config.textColor}`}>{importStatus.progress}%</span>
          </div>

          {importStatus.status !== 'idle' && (
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <motion.div
                className={`absolute inset-y-0 left-0 ${config.progressColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${importStatus.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className={`${config.textColor}/80`}>
              {importStatus.processedFaces.toLocaleString()} faces processed
            </span>

            {importStatus.status === 'completed' && <span className="text-green-400/80">All done! 🎉</span>}
          </div>

          {importStatus.status === 'failed' && importStatus.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-red-500/20"
            >
              <p className="text-xs text-red-400/80 mb-3">{importStatus.error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Retry Import
                </button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
