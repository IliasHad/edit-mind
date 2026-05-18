import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { PlusIcon, KeyIcon } from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'
import { DeleteModal } from '@ui/components/DeleteModal'
import { useAccessTokensStore } from '../stores/accessTokens'
import { TokenCreatedModal } from './TokenCreatedModal'
import type { AccessToken } from '../types/accessTokens'
import { SCOPE_LABELS } from '../types/accessTokens'

export function AccessTokensSettings() {
  const navigate = useNavigate()
  const { tokens, isLoading, fetchTokens, revokeToken } = useAccessTokensStore()
  const [tokenToRevoke, setTokenToRevoke] = useState<AccessToken | null>(null)

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleRevoke = async () => {
    if (!tokenToRevoke) return
    await revokeToken(tokenToRevoke.id)
    setTokenToRevoke(null)
  }

  const activeCount = tokens.filter(
    (t) => !t.expiresAt || new Date(t.expiresAt) > new Date()
  ).length

  const lastActive = tokens
    .filter((t) => t.lastUsedAt)
    .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())[0]
    ?.lastUsedAt

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">API Tokens</h2>
          <p className="text-sm text-white/50 mt-0.5">
            Tokens grant access to the Edit Mind API from Claude or external tools.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusIcon />}
          onClick={() => navigate('/app/settings/tokens/new')}
        >
          New token
        </Button>
      </div>

      {tokens.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3">
            <p className="text-xs text-white/40 mb-1">Active tokens</p>
            <p className="text-2xl font-semibold text-white">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3">
            <p className="text-xs text-white/40 mb-1">Last active</p>
            <p className="text-sm font-medium text-white mt-0.5">
              {lastActive ? formatDate(lastActive) : <span className="text-white/30">—</span>}
            </p>
          </div>
        </div>
      )}

      {isLoading && tokens.length === 0 ? (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 bg-white/5 animate-pulse border-b border-white/[0.06] last:border-b-0"
            />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState onCreateClick={() => navigate('/app/settings/tokens/new')} />
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                  Token
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide hidden md:table-cell">
                  Scopes
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">
                  Last used
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {tokens.map((token) => (
                <TokenRow key={token.id} token={token} onRevoke={() => setTokenToRevoke(token)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeleteModal
        isOpen={!!tokenToRevoke}
        onClose={() => setTokenToRevoke(null)}
        onConfirm={handleRevoke}
        title="Revoke token"
        description="Any integrations using this token will stop working immediately."
        resourceName={tokenToRevoke?.name ?? ''}
        confirmText="Revoke"
      />
    </section>
  )
}

function TokenRow({ token, onRevoke }: { token: AccessToken; onRevoke: () => void }) {
  const isExpired = token.expiresAt ? new Date(token.expiresAt) < new Date() : false

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-white/90 truncate">{token.name}</span>
          {isExpired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 leading-none shrink-0">
              Expired
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {token.scopes.slice(0, 3).map((scope) => (
            <span
              key={scope}
              className={`text-xs px-1.5 py-0.5 rounded-md font-mono border ${
                scope.endsWith('_write')
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-white/5 text-white/50 border-white/10'
              }`}
            >
              {SCOPE_LABELS[scope]?.label ?? scope}
            </span>
          ))}
          {token.scopes.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
              +{token.scopes.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell text-white/50 text-xs">
        {token.lastUsedAt ? (
          formatDate(token.lastUsedAt)
        ) : (
          <span className="text-white/25">Never</span>
        )}
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell text-white/50 text-xs">
        {formatDate(token.createdAt)}
      </td>
      <td className="px-4 py-3.5 text-right">
        <button
          onClick={onRevoke}
          className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
        >
          Revoke
        </button>
      </td>
    </tr>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <div className="mx-auto mb-4 size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <KeyIcon className="size-5 text-white/40" />
      </div>
      <p className="text-sm font-medium text-white/70 mb-1">No API tokens yet</p>
      <p className="text-xs text-white/40 mb-5">
        Create a token to connect Claude or external tools to your video library.
      </p>
      <Button variant="ghost" size="sm" leftIcon={<PlusIcon />} onClick={onCreateClick}>
        Create your first token
      </Button>
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
