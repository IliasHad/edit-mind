import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { MetaFunction } from 'react-router'
import {
  CheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { SummaryRow } from '~/features/settings/components/SummaryRow'
import { TokenCreatedModal } from '~/features/settings/components/TokenCreatedModal'
import type { AccessTokenScope } from '~/features/settings/types/accessTokens'
import { SCOPE_LABELS, MCP_SCOPES } from '~/features/settings/types/accessTokens'
import { useAccessTokensStore } from '~/features/settings/stores/accessTokens'

export const meta: MetaFunction = () => [{ title: 'Create API Token | Edit Mind' }]

const ALL_SCOPES: AccessTokenScope[] = [
  'videos_read',
  'collections_read',
  'media_read',
  'folders_read',
  'jobs_read',
  'chats_write',
  'collections_write',
  'folders_write',
  'videos_write',
]

const EXPIRY_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiration', days: null },
] as const

function getExpiresAt(days: number | null): string | null {
  if (days === null) return null
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function getExpiresLabel(days: number | null): string {
  if (days === null) return 'Never'
  if (days < 365) return `in ${days}d`
  return 'in 1 year'
}

const SETTINGS_PATH = '/app/settings?tab=accessTokens'

export default function NewTokenPage() {
  const navigate = useNavigate()
  const { createToken, isLoading } = useAccessTokensStore()

  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<Set<AccessTokenScope>>(new Set())
  const [expiryDays, setExpiryDays] = useState<number | null>(90)
  const [createdToken, setCreatedToken] = useState<{ name: string; rawToken: string } | null>(null)

  const toggleScope = (scope: AccessTokenScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createToken({
      name: name.trim(),
      scopes: Array.from(selectedScopes),
      expiresAt: getExpiresAt(expiryDays),
    })
    if (result) {
      setCreatedToken({ name: name.trim(), rawToken: result.rawToken })
    }
  }

  const isValid = name.trim().length > 0 && selectedScopes.size > 0

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Create a new API token</h1>
          <p className="text-sm text-white/50 mt-1">
            Tokens grant programmatic access scoped to specific actions. You can revoke them at any time.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-6 items-start">

            <div className="flex-1 min-w-0 space-y-4">

              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
                <h2 className="text-sm font-semibold text-white mb-1">Name</h2>
                <p className="text-xs text-white/50 mb-3">
                  For your reference. Choose something that describes where it&apos;ll live.
                </p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Premiere plugin, Claude Code"
                  maxLength={100}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors"
                />
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-white">Scopes</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedScopes(new Set(MCP_SCOPES))}
                    className="text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    MCP preset
                  </button>
                </div>
                <p className="text-xs text-white/50 mb-4">
                  Pick the minimum required permissions.
                </p>

                <div className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
                  {ALL_SCOPES.map((scope) => {
                    const { label, description } = SCOPE_LABELS[scope]
                    const checked = selectedScopes.has(scope)
                    return (
                      <label
                        key={scope}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/4 transition-colors"
                      >
                        <div
                          className={`size-4 rounded shrink-0 flex items-center justify-center border transition-colors ${checked ? 'bg-white border-white' : 'bg-white/5 border-white/20'
                            }`}
                        >
                          {checked && <CheckIcon className="size-3 text-black stroke-3" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleScope(scope)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-sm text-white/80">{label}</span>
                          <p className="text-xs text-white/40 mt-0.5">{description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6">
                <h2 className="text-sm font-semibold text-white mb-1">Expiration</h2>
                <p className="text-xs text-white/50 mb-4">
                  Tokens expire automatically. We recommend rotating every 90 days.
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setExpiryDays(preset.days)}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors border ${expiryDays === preset.days
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white/80'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-72 shrink-0 sticky top-8">
              <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Summary</h2>

                <div className="space-y-3 mb-4 text-sm">
                  <SummaryRow
                    label="Name"
                    value={
                      name.trim()
                        ? <span className="text-white/80">{name.trim()}</span>
                        : <span className="text-white/30">not set</span>
                    }
                  />
                  <SummaryRow
                    label="Scopes"
                    value={
                      selectedScopes.size > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {Array.from(selectedScopes).map((s) => (
                            <span
                              key={s}
                              className={`inline-flex px-1.5 py-0.5 rounded-md text-xs font-mono border ${s.endsWith('_write')
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-white/5 text-white/60 border-white/10'
                                }`}
                            >
                              {SCOPE_LABELS[s].label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-white/30">none</span>
                      )
                    }
                  />
                  <SummaryRow
                    label="Expires"
                    value={<span className="text-white/80">{getExpiresLabel(expiryDays)}</span>}
                  />
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={isLoading}
                    disabled={!isValid || isLoading}
                    leftIcon={<KeyIcon />}
                  >
                    Create token
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate(SETTINGS_PATH)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <TokenCreatedModal
        isOpen={!!createdToken}
        onClose={() => navigate(SETTINGS_PATH)}
        tokenName={createdToken?.name ?? ''}
        rawToken={createdToken?.rawToken ?? ''}
      />
    </DashboardLayout>
  )
}
