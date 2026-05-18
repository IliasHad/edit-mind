import { useState } from 'react'
import { Modal } from '@ui/components/Modal'
import { Button } from '@ui/components/Button'
import { SparklesIcon } from '@heroicons/react/24/outline'
import type { AccessTokenScope, CreateTokenInput } from '../types/accessTokens'
import { SCOPE_LABELS, MCP_SCOPES } from '../types/accessTokens'

interface CreateTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateTokenInput) => Promise<void>
  isLoading: boolean
}

const READ_SCOPES: AccessTokenScope[] = ['videos_read', 'collections_read', 'media_read', 'folders_read', 'jobs_read']
const WRITE_SCOPES: AccessTokenScope[] = ['chats_write', 'collections_write', 'folders_write', 'videos_write']

export function CreateTokenModal({ isOpen, onClose, onSubmit, isLoading }: CreateTokenModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<Set<AccessTokenScope>>(new Set())
  const [expiresAt, setExpiresAt] = useState('')

  const toggleScope = (scope: AccessTokenScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  const applyMcpPreset = () => {
    setSelectedScopes(new Set(MCP_SCOPES))
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedScopes(new Set())
    setExpiresAt('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      scopes: Array.from(selectedScopes),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
  }

  const isValid = name.trim().length > 0 && selectedScopes.size > 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="lg">
      <div className="p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">Create API Token</h2>
          <p className="text-sm text-white/60">The token will only be shown once after creation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Claude Desktop"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note about what this token is for"
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-white/80">
                Scopes <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={applyMcpPreset}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                <SparklesIcon className="size-3.5" />
                MCP preset
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Read</p>
              </div>
              {READ_SCOPES.map((scope) => (
                <ScopeRow
                  key={scope}
                  scope={scope}
                  checked={selectedScopes.has(scope)}
                  onChange={() => toggleScope(scope)}
                />
              ))}
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Write</p>
              </div>
              {WRITE_SCOPES.map((scope) => (
                <ScopeRow
                  key={scope}
                  scope={scope}
                  checked={selectedScopes.has(scope)}
                  onChange={() => toggleScope(scope)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Expiry date</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors [color-scheme:dark]"
            />
            <p className="mt-1.5 text-xs text-white/40">Leave empty for a token that never expires.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isLoading} disabled={!isValid || isLoading} fullWidth>
              Create Token
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function ScopeRow({
  scope,
  checked,
  onChange,
}: {
  scope: AccessTokenScope
  checked: boolean
  onChange: () => void
}) {
  const { label, description } = SCOPE_LABELS[scope]
  return (
    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-white/20 bg-white/5 text-white accent-white cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
    </label>
  )
}
