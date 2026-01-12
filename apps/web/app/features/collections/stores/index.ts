import type { Scene } from '@shared/schemas'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CollectionWithItems } from '../types'
import { apiClient } from '../services/api'

interface CollectionsState {
  collections: CollectionWithItems[]
  currentCollection: CollectionWithItems | null
  currentScenes: Scene[]
  isLoading: boolean
  error: string | null
  fetchCollections: () => Promise<void>
  fetchCollectionById: (id: string) => Promise<void>
  fetchCollectionScenes: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentCollection: () => void

  exportCollectionSelectedScenes: (id: string, selectedSceneIds: string[]) => Promise<void>

  totalVideos: number
  totalDuration: number
}

export const useCollectionsStore = create<CollectionsState>()(
  devtools(
    persist(
      (set) => ({
        collections: [],
        currentCollection: null,
        currentScenes: [],
        isLoading: false,
        error: null,
        totalVideos: 0,
        totalDuration: 0,

        fetchCollections: async () => {
          set({ isLoading: true, error: null })
          try {
            const { collections, totalDuration, totalVideos } = await apiClient.list()

            set({ collections, totalDuration, totalVideos, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
          }
        },

        fetchCollectionById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const { collection } = await apiClient.get(id)

            set({ currentCollection: collection, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentCollection: null,
            })
          }
        },

        fetchCollectionScenes: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const { scenes } = await apiClient.scenes(id)

            set({ currentScenes: scenes, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentScenes: [],
            })
          }
        },
        exportCollectionSelectedScenes: async (id: string, selectedSceneIds: string[]) => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.exportScenes(id, selectedSceneIds)

            set({ isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentScenes: [],
            })
          }
        },
        clearError: () => set({ error: null }),

        clearCurrentCollection: () => set({ currentCollection: null, currentScenes: [] }),
      }),
      {
        name: 'collections-storage',
        partialize: (state) => ({ collections: state.collections }),
      }
    ),
    { name: 'collections-store' }
  )
)
