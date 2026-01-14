import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  resourceName?: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'success' | 'warning'
}

const modalVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const variantStyles = {
  primary: {
    iconBg: 'bg-blue-100 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
  },
  success: {
    iconBg: 'bg-green-100 dark:bg-green-950/50',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
  },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  resourceName,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const styles = variantStyles[variant]

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleBackdropClick = () => {
    if (!isConfirming) {
      onClose()
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="confirm-modal-backdrop"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            key="confirm-modal-content"
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-white dark:bg-black rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              disabled={isConfirming}
              aria-label="Close modal"
              className="absolute right-4 top-4 p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="size-5" />
            </button>

            <div className="p-6">
              <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${styles.iconBg}`}>
                <CheckCircleIcon className={`size-6 ${styles.iconColor}`} />
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white mb-2">{title}</h2>

              <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">{description}</p>

              {resourceName && (
                <div className="mt-4 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2">
                  <p className="text-sm font-medium text-black/70 dark:text-white/70 truncate">{resourceName}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isConfirming}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-white ${styles.buttonBg} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {isConfirming ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
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
