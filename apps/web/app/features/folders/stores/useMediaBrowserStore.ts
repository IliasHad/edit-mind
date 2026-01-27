import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MediaItem {
  path: string
  name: string
  isDirectory: boolean
  mtime?: number
}

interface MediaBrowserState {
  currentPath: string
  folders: MediaItem[]
  files: MediaItem[]
  isLoading: boolean
  error: string | null
  selectedPath: string | null
  
  setCurrentPath: (path: string) => void
  setFolders: (folders: MediaItem[]) => void
  setFiles: (files: MediaItem[]) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setSelectedPath: (path: string | null) => void
  fetchFolders: (path?: string) => Promise<void>
  fetchFiles: (path?: string) => Promise<void>
  navigateToFolder: (path: string) => Promise<void>
  reset: () => void
}

const initialState = {
  currentPath: '/',
  folders: [],
  files: [],
  isLoading: false,
  error: null,
  selectedPath: null,
}

export const useMediaBrowserStore = create<MediaBrowserState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setCurrentPath: (path) => set({ currentPath: path }),
      setFolders: (folders) => set({ folders }),
      setFiles: (files) => set({ files }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSelectedPath: (selectedPath) => set({ selectedPath }),

      fetchFolders: async (path) => {
        const targetPath = path ?? get().currentPath
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(
            `/api/media/folders?path=${encodeURIComponent(targetPath)}`
          )

          if (!response.ok) {
            throw new Error('Failed to fetch folders')
          }

          const data = await response.json()

          if (data.error) {
            throw new Error(data.error)
          }

          set({
            folders: data.folders || [],
            currentPath: targetPath,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch folders',
            isLoading: false,
            folders: [],
          })
        }
      },

      fetchFiles: async (path) => {
        const targetPath = path ?? get().currentPath
        set({ isLoading: true, error: null })

        try {
          const response = await fetch(
            `/api/media/files?path=${encodeURIComponent(targetPath)}`
          )

          if (!response.ok) {
            throw new Error('Failed to fetch files')
          }

          const data = await response.json()

          if (data.error) {
            throw new Error(data.error)
          }

          set({
            files: data.files || [],
            currentPath: targetPath,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch files',
            isLoading: false,
            files: [],
          })
        }
      },

      navigateToFolder: async (path) => {
        set({ currentPath: path })
        await get().fetchFolders(path)
        await get().fetchFiles(path)
      },

      reset: () => set(initialState),
    }),
    { name: 'media-browser-store' }
  )
)