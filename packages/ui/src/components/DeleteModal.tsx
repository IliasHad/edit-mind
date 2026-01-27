import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
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
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={!isDeleting} showCloseButton={!isDeleting}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>

        <p className="text-sm text-white/60 leading-relaxed">{description}</p>

        {resourceName && (
          <div className="mt-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <p className="text-sm font-medium text-white/80 truncate font-mono">{resourceName}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting} fullWidth>
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting} loading={isDeleting} fullWidth>
            {isDeleting ? 'Deleting...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
