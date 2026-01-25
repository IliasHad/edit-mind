import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from './Button'
import { Modal } from './Modal'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  buttonText?: string
  variant?: 'info' | 'success' | 'warning' | 'error'
}

const variantConfig = {
  info: {
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  success: {
    iconBg: 'bg-green-500/10 border-green-500/20',
    iconColor: 'text-green-400',
  },
  warning: {
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },
  error: {
    iconBg: 'bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-400',
  },
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  buttonText = 'Got it',
  variant = 'info',
}: AlertModalProps) {
  const config = variantConfig[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="p-6">
        <div className={`mb-4 flex size-12 items-center justify-center rounded-xl border ${config.iconBg}`}>
          <InformationCircleIcon className={`size-6 ${config.iconColor}`} />
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          {title}
        </h2>

        <p className="text-sm text-white/60 leading-relaxed">
          {description}
        </p>

        <div className="mt-6">
          <Button
            variant="primary"
            onClick={onClose}
            fullWidth
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}