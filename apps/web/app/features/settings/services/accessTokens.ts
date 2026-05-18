import type { AccessToken, CreateTokenInput } from '../types/accessTokens'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API Error (${res.status}): ${text}`)
  }
  return res.json()
}

export const accessTokensApi = {
  list: () =>
    request<{ tokens: AccessToken[] }>('/api/access-tokens'),

  create: (input: CreateTokenInput) =>
    request<{ token: AccessToken; rawToken: string }>('/api/access-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  revoke: (id: string) =>
    request<{ success: boolean }>(`/api/access-tokens/${id}`, { method: 'DELETE' }),
}
