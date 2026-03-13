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
  updateVideoLocation: (id: string, locationName: string) => Promise<void>
  addVideoLabels: (id: string, labels: Record<string, string>[]) => Promise<void>
  clearError: () => void
  clearCurrentVideo: () => void
  importDemoVideos: () => Promise<void>

  currentScenes: Scene[]

  isProcessing: boolean

  currentProcessedJob: Job | null

  relinkSuccess: boolean
  updateLocationSuccess: boolean
  addLabelsSuccess: boolean
  importVideoSuccess: boolean

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
        updateLocationSuccess: false,
        addLabelsSuccess: false,
        importVideoSuccess: false,

        fetchVideos: async (pageNum, limit, query) => {
          set({ isLoading: true, error: null })
          try {
            const { videos, hasMore, page } = await apiClient.list(pageNum, limit, query)

            set((state) => ({
              videos: pageNum === 0 ? videos : [...state.videos, ...videos],
              isLoading: false,
              currentPagination: {
                hasMore,
                page,
              },
            }))
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
        updateVideoLocation: async (id: string, locationName: string) => {
          set({ isLoading: true, error: null, updateLocationSuccess: false })
          try {
            await apiClient.updateVideoLocation(id, locationName)
            set({ isLoading: false, error: null, updateLocationSuccess: true })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
              updateLocationSuccess: false
            })
          }
        },
        addVideoLabels: async (id: string, labels: Record<string, string>[]) => {
          set({ isLoading: true, error: null, addLabelsSuccess: false })
          try {
            await apiClient.addVideoLabels(id, labels)
            set({ isLoading: false, error: null, addLabelsSuccess: true })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentVideo: null,
              addLabelsSuccess: false
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

        importDemoVideos: async () => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.importDemoVideos()
            set({ isLoading: false, importVideoSuccess: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
          }
        },
      }),
      {
        name: 'videos-storage',
        partialize: (state) => ({ videos: state.videos }),
      }
    ),
    { name: 'videos-store' }
  )
)