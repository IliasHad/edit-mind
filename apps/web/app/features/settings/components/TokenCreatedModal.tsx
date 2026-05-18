import { useState } from 'react'
import { Modal } from '@ui/components/Modal'
import { Button } from '@ui/components/Button'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface TokenCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  tokenName: string
  rawToken: string
}

export function TokenCreatedModal({ isOpen, onClose, tokenName, rawToken }: TokenCreatedModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" closeOnBackdrop={false} showCloseButton={false}>
      <div className="p-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Token created</span>
          </div>
          <h2 className="text-xl font-semibold text-white">{tokenName}</h2>
          <p className="text-sm text-white/50 mt-1">
            Copy this token now. For security, we won&apos;t display it again.
          </p>
        </div>

        <div className="relative mb-4">
          <div className="w-full px-4 py-3 pr-12 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-white/90 break-all select-all leading-relaxed">
            {rawToken}
          </div>
          <button
            onClick={handleCopy}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Copy token"
          >
            {copied ? (
              <CheckIcon className="size-4 text-green-400" />
            ) : (
              <ClipboardDocumentIcon className="size-4" />
            )}
          </button>
        </div>

        <Button variant="primary" fullWidth onClick={onClose}>
          {copied ? 'Done' : "I've saved it"}
        </Button>
      </div>
    </Modal>
  )
}
