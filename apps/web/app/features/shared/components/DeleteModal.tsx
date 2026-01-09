import { motion, AnimatePresence } from 'framer-motion'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  resourceName: string
  confirmText?: string
  cancelText?: string
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  resourceName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white mb-2">{title}</h2>

              <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-1">{description}</p>

              <div className="mt-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2">
                <p className="text-sm font-medium text-black/70 dark:text-white/70 truncate">{resourceName}</p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
