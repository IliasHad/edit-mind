import { motion } from 'framer-motion'
import { CheckCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'

interface ExportedScenesProps {
  exportId: string
}

export function ExportedScenes({ exportId }: ExportedScenesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <CheckCircleIcon className="w-6 h-6 text-black/70 dark:text-white/70" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-[15px] font-medium text-black/70 dark:text-white/70 mb-1">Export complete</h4>
            <p className="text-sm text-black/50 dark:text-white/50">
              Your scenes have been successfully exported to ZIP file format.
            </p>
          </div>
          <a
            href={`/exports/${exportId}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm text-white bg-black dark:bg-white dark:text-black hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            View Export
          </a>
        </div>
      </div>
    </motion.div>
  )
}
