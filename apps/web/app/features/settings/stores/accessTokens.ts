import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { AccessToken, CreateTokenInput } from '../types/accessTokens'
import { accessTokensApi } from '../services/accessTokens'

interface AccessTokensState {
  tokens: AccessToken[]
  isLoading: boolean
  error: string | null

  fetchTokens: () => Promise<void>
  createToken: (input: CreateTokenInput) => Promise<{ token: AccessToken; rawToken: string } | null>
  revokeToken: (id: string) => Promise<void>
  clearError: () => void
}

export const useAccessTokensStore = create<AccessTokensState>()(
  devtools(
    (set) => ({
      tokens: [],
      isLoading: false,
      error: null,

      fetchTokens: async () => {
        set({ isLoading: true, error: null })
        try {
          const { tokens } = await accessTokensApi.list()
          set({ tokens, isLoading: false })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load tokens', isLoading: false })
        }
      },

      createToken: async (input) => {
        set({ isLoading: true, error: null })
        try {
          const result = await accessTokensApi.create(input)
          set((state) => ({ tokens: [result.token, ...state.tokens], isLoading: false }))
          return result
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create token', isLoading: false })
          return null
        }
      },

      revokeToken: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await accessTokensApi.revoke(id)
          set((state) => ({ tokens: state.tokens.filter((t) => t.id !== id), isLoading: false }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to revoke token', isLoading: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'access-tokens-store' }
  )
)
