import type { Scene } from '@shared/schemas'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CollectionWithItems } from '../types'
import { apiClient } from '../services/api'
import type { SortOption, SortOrder } from '~/features/videos/types'

interface CollectionsState {
  collections: CollectionWithItems[]
  currentCollection: CollectionWithItems | null
  currentScenes: Scene[]
  isLoading: boolean
  error: string | null
  fetchCollections: () => Promise<void>
  fetchCollectionById: (id: string, sortBy: SortOption, sortOrder: SortOrder) => Promise<void>
  fetchCollectionScenes: (id: string) => Promise<void>
  clearError: () => void
  clearCurrentCollection: () => void

  exportCollectionSelectedScenes: (id: string, selectedSceneIds: string[]) => Promise<void>

  totalVideos: number
  totalDuration: number

  sortBy: SortOption | null
  sortOrder: SortOrder | null
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
        sortOrder: null,
        sortBy: null,

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

        fetchCollectionById: async (id: string, sortBy: SortOption, sortOrder: SortOrder) => {
          set({ isLoading: true, error: null })
          try {
            const { collection } = await apiClient.get(id, sortBy, sortOrder)

            set({ currentCollection: collection, isLoading: false, sortBy, sortOrder })
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
