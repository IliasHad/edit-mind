import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ImmichImportStatus, ImmichIntegration } from '@immich/types/immich'
import { immichApiClient } from '../services/api'
import { type ImmichConfig } from '@immich/types/immich'

interface ImmichState {
  integration: ImmichIntegration | null
  importStatus: ImmichImportStatus
  isLoading: boolean
  error: string | null

  showApiKeyForm: boolean
  fetchConfig: () => Promise<void>
  saveIntegration: (config: ImmichConfig) => Promise<ImmichIntegration | null>
  updateIntegration: (config: ImmichConfig) => Promise<ImmichIntegration | null>
  deleteIntegration: () => Promise<void>
  refreshImport: () => Promise<void>
  testConnection: (config: ImmichConfig) => Promise<{ success: boolean; message: string }>
  clearError: () => void
  setImportStatus: (status: Partial<ImmichImportStatus>) => void
  setShowApiKeyForm: (status: boolean) => void
}

export const useImmichStore = create<ImmichState>()(
  devtools(
    persist(
      (set, get) => ({
        integration: null,
        importStatus: {
          isImporting: true,
          progress: 0,
          totalFaces: 0,
          processedFaces: 0,
          status: 'completed',
          error: null,
        },
        isLoading: false,
        error: null,
        showApiKeyForm: false,

        fetchConfig: async () => {
          set({ isLoading: true, error: null })
          try {
            const { config } = await immichApiClient.getConfig()
            set({ integration: config, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch config',
              isLoading: false,
            })
          }
        },

        saveIntegration: async (config: ImmichConfig) => {
          set({ isLoading: true, error: null })
          try {
            const { integration } = await immichApiClient.saveIntegration(config)
            set({ integration, isLoading: false })
            return integration
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to save integration',
              isLoading: false,
            })
            return null
          }
        },

        updateIntegration: async (config: ImmichConfig) => {
          set({ isLoading: true, error: null })
          try {
            const { integration } = await immichApiClient.updateIntegration(config)
            set({ integration, isLoading: false })
            return integration
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update integration',
              isLoading: false,
            })
            return null
          }
        },

        deleteIntegration: async () => {
          set({ isLoading: true, error: null })
          try {
            await immichApiClient.deleteIntegration()
            set({
              integration: null,
              isLoading: false,
              importStatus: {
                isImporting: false,
                progress: 0,
                processedFaces: 0,
                status: 'idle',
                error: null,
              },
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete integration',
              isLoading: false,
            })
          }
        },

        refreshImport: async () => {
          set({ isLoading: true, error: null })
          try {
            await immichApiClient.refreshImport()
            set({
              isLoading: false,
              importStatus: {
                ...get().importStatus,
                status: 'importing',
                isImporting: true,
              },
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to refresh import',
              isLoading: false,
            })
          }
        },

        testConnection: async (config: ImmichConfig) => {
          set({ isLoading: true, error: null })
          try {
            const { success, message } = await immichApiClient.testConnection(config)
            set({ isLoading: false })
            return { success, message }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Connection test failed',
              isLoading: false,
            })
            return { success: false, message: 'Connection test failed' }
          }
        },

        clearError: () => set({ error: null }),

        setImportStatus: (status: Partial<ImmichImportStatus>) => {
          set((state) => ({
            importStatus: {
              ...state.importStatus,
              ...status,
            },
          }))
        },
        setShowApiKeyForm: (status: boolean) => {
          set(() => ({
            showApiKeyForm: status,
          }))
        },
      }),
      {
        name: 'immich-storage',
        partialize: (state) => ({
          integration: state.integration,
        }),
      }
    ),
    { name: 'immich-store' }
  )
)
