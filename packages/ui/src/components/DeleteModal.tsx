import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      closeOnBackdrop={!isDeleting}
      showCloseButton={!isDeleting}
    >
      <div className="p-6">
        {/* Warning Icon */}
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
          <ExclamationTriangleIcon className="size-6 text-red-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white mb-2">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm text-white/60 leading-relaxed">
          {description}
        </p>

        {/* Resource Name */}
        <div className="mt-4 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2.5">
          <p className="text-sm font-medium text-red-400 truncate font-mono">
            {resourceName}
          </p>
        </div>

        {/* Warning Notice */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <ExclamationTriangleIcon className="size-4 text-white/60 shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 leading-relaxed">
            This action cannot be undone. All associated data will be permanently removed.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            loading={isDeleting}
            fullWidth
          >
            {isDeleting ? 'Deleting...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}