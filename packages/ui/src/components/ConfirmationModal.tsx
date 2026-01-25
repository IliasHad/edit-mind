import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid'
import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  resourceName?: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'success' | 'warning' | 'info'
  icon: ReactNode
}

const variantConfig = {
  primary: {
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    icon: CheckCircleIcon,
  },
  success: {
    iconBg: 'bg-green-500/10 border-green-500/20',
    iconColor: 'text-green-400',
    icon: CheckCircleIcon,
  },
  warning: {
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    icon: ExclamationCircleIcon,
  },
  info: {
    iconBg: 'bg-white/10 border-white/20',
    iconColor: 'text-white',
    icon: InformationCircleIcon,
  },
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  resourceName,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  icon,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const config = variantConfig[variant]
  const Icon = icon || config.icon

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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      closeOnBackdrop={!isConfirming}
      showCloseButton={!isConfirming}
    >
      <div className="p-6">
        <div className={`mb-4 flex size-12 items-center justify-center rounded-xl border ${config.iconBg}`}>
          <Icon className={`size-6 ${config.iconColor}`} />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          {title}
        </h2>

        <p className="text-sm text-white/60 leading-relaxed">
          {description}
        </p>

        {resourceName && (
          <div className="mt-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <p className="text-sm font-medium text-white/80 truncate font-mono">
              {resourceName}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isConfirming}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isConfirming}
            loading={isConfirming}
            fullWidth
          >
            {isConfirming ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}