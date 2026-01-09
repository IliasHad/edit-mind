import { motion, AnimatePresence } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/solid'

interface ReindexVideoProps {
  isOpen: boolean
  source: string
  onClose: () => void
  onReindex: (source: string) => void
  isReindexing: boolean
}

export function ReindexVideo({ isOpen, source, onClose, onReindex, isReindexing }: ReindexVideoProps) {
  const handleConfirmReindex = async () => {
    onReindex(source)
  }

  const fileName = source.split('/').pop()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-black rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-black/10 dark:border-white/10"
          >
            <div className="px-6 py-5 flex items-start gap-4 border-b border-black/10 dark:border-white/10">
              <div className="p-3 flex items-center justify-center rounded-xl bg-blue-500/10">
                <ArrowPathIcon className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black dark:text-white">Re-index Video</h3>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  Are you sure you want to re-index this video?
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
                <p className="text-sm font-medium text-black dark:text-white truncate">{fileName}</p>
                <p className="text-xs font-mono text-black/40 dark:text-white/40 truncate mt-1">{source}</p>
              </div>
              <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                This will re-run frame analysis and scene creation. Existing transcriptions and embeddings will be
                preserved.
              </p>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-black/10 dark:border-white/10">
              <button
                onClick={onClose}
                disabled={isReindexing}
                className="px-5 py-2 rounded-xl font-medium text-sm text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReindex}
                disabled={isReindexing}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isReindexing ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    Re-indexing...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="size-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
