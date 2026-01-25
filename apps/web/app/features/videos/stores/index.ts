import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { apiClient } from '../services/api'
import type { Job } from '@prisma/client'
import type { Scene } from '@shared/types/scene'
import type { VideoWithCollectionsAndProjects, VideoWithFolderPath } from '../types'

interface VideosState {
  videos: VideoWithFolderPath[]
  currentVideo: VideoWithCollectionsAndProjects | null
  isLoading: boolean
  error: string | null
  fetchVideos: (page: number, limit: number, query: string) => Promise<void>
  fetchVideoById: (id: string) => Promise<void>
  deleteVideoById: (id: string) => Promise<void>
  reindexVideo: (id: string) => Promise<void>
  relinkVideo: (id: string, newSource: string) => Promise<void>
  clearError: () => void
  clearCurrentVideo: () => void

  currentScenes: Scene[]

  isProcessing: boolean

  currentProcessedJob: Job | null

  relinkSuccess: boolean

  videoExist: boolean

  currentPagination: {
    page: number
    hasMore: boolean
  } | null
}

export const useVideosStore = create<VideosState>()(
  devtools(
    persist(
      (set) => ({
        videos: [],
        currentVideo: null,
        isLoading: false,
        error: null,
        currentScenes: [],
        currentCollections: [],
        currentProjects: [],
        isProcessing: false,
        currentProcessedJob: null,
        relinkSuccess: false,
        videoExist: false,
        currentPagination: null,

        fetchVideos: async (pageNum, limit, query) => {
          set({ isLoading: true, error: null })
          try {
            const { videos, hasMore, page } = await apiClient.list(pageNum, limit, query)

            set({
              videos,
              isLoading: false,
              currentPagination: {
                hasMore,
                page,
              },
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
          }
        },

        fetchVideoById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const { video, scenes, isProcessing, processedJob, videoExist } = await apiClient.get(id)

            set({
              currentVideo: video,
              isLoading: false,
              currentScenes: scenes,
              isProcessing,
              currentProcessedJob: processedJob,
              videoExist,
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
            })
          }
        },
        deleteVideoById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.delete(id)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
            })
          }
        },
        reindexVideo: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.reindexVideo(id)
            set({ isLoading: false, error: null })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
            })
          }
        },
        relinkVideo: async (id: string, newSource: string) => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.relinkVideo(id, newSource)
            set({ isLoading: false, relinkSuccess: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
            })
          }
        },
        clearError: () => set({ error: null }),

        clearCurrentVideo: () => set({ currentVideo: null }),
      }),
      {
        name: 'collections-storage',
        partialize: (state) => ({ videos: state.videos }),
      }
    ),
    { name: 'collections-store' }
  )
)
