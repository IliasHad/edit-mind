import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { type ReactNode } from 'react'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  closeOnBackdrop?: boolean
  showCloseButton?: boolean
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
}: ModalProps) {
  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              relative w-full ${maxWidthClasses[maxWidth]}
              rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl
              shadow-2xl overflow-hidden
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  leftIcon={<XMarkIcon />}
                  variant="glass"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close modal"
                />
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}