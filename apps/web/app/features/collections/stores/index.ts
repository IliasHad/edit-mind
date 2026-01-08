import type { Collection, CollectionItem, Video } from '@prisma/client'
import type { Scene } from '@shared/schemas'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type CollectionWithItems = Collection & {
  items: (CollectionItem & {
    video: Video
  })[]
  totalDuration: string
}

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
            const response = await fetch('/api/collections')

            if (!response.ok) {
              throw new Error(`Failed to fetch collections: ${response.statusText}`)
            }

            const { collections, totalDuration, totalVideos } = await response.json()

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
            const response = await fetch(`/api/collections/${id}`)

            if (!response.ok) {
              throw new Error(`Failed to fetch collection: ${response.statusText}`)
            }

            const { collection } = await response.json()

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
            const response = await fetch(`/api/collections/${id}/scenes`)

            if (!response.ok) {
              throw new Error(`Failed to fetch scenes: ${response.statusText}`)
            }

            const { scenes } = await response.json()

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
            const response = await fetch(`/api/collections/${id}/scenes/export`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ selectedSceneIds }),
            })

            if (!response.ok) {
              throw new Error(`Failed to export scenes: ${response.statusText}`)
            }

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
