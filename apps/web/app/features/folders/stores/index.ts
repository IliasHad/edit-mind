import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { FolderCreateInput, FolderUpdateInput, FolderWithJobs } from '../types'
import { apiClient } from '../services/api'

interface FoldersState {
    folders: FolderWithJobs[]
    currentFolder: FolderWithJobs | null
    isLoading: boolean
    error: string | null
    showSuccess?: boolean

    fetchFolders: () => Promise<void>
    fetchFolderById: (id: string) => Promise<FolderWithJobs | null>
    createFolder: (input: FolderCreateInput) => Promise<FolderWithJobs | null>
    updateFolder: (id: string, input: FolderUpdateInput) => Promise<FolderWithJobs | null>
    deleteFolder: (id: string) => Promise<void>
    rescanFolder: (id: string) => Promise<void>

    clearError: () => void
    clearCurrentFolder: () => void
    setCurrentFolder: (folder: FolderWithJobs | null) => void
    refreshFolders: () => Promise<void>
}

export const useFoldersStore = create<FoldersState>()(
    devtools(
        persist(
            (set, get) => ({
                folders: [],
                currentFolder: null,
                isLoading: false,
                error: null,
                showSuccess: false,

                fetchFolders: async () => {
                    set({ isLoading: true, error: null })
                    try {
                        const { folders } = await apiClient.list()

                        set({ folders, isLoading: false })
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                        })
                    }
                },

                fetchFolderById: async (id: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        const { folder } = await apiClient.get(id)

                        set({
                            currentFolder: folder,
                            isLoading: false,
                        })
                        return folder
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                            currentFolder: null,
                        })
                        return null
                    }
                },

                createFolder: async (input: FolderCreateInput) => {
                    set({ isLoading: true, error: null })
                    try {
                        const { folder } = await apiClient.create(input)

                        set((state) => ({
                            folders: [...state.folders, folder],
                            isLoading: false,
                            showSuccess: true,
                        }))

                        setTimeout(() => set({ showSuccess: false }), 3000)

                        return folder
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                        })
                        return null
                    }
                },

                updateFolder: async (id: string, input: FolderUpdateInput) => {
                    set({ isLoading: true, error: null })
                    try {
                        const { folder } = await apiClient.update(id, input)

                        set((state) => ({
                            folders: state.folders.map((f) => (f.id === id ? folder : f)),
                            currentFolder: state.currentFolder?.id === id ? folder : state.currentFolder,
                            isLoading: false,
                            showSuccess: true,
                        }))

                        setTimeout(() => set({ showSuccess: false }), 3000)

                        return folder
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                        })
                        return null
                    }
                },

                deleteFolder: async (id: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        await apiClient.delete(id)
                        set((state) => ({
                            folders: state.folders.filter((f) => f.id !== id),
                            currentFolder: state.currentFolder?.id === id ? null : state.currentFolder,
                            isLoading: false,
                        }))
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                        })
                    }
                },

                rescanFolder: async (id: string) => {
                    set({ isLoading: true, error: null })
                    try {
                        const { folder } = await apiClient.rescan(id)

                        set((state) => ({
                            folders: state.folders.map((f) => (f.id === id ? folder : f)),
                            currentFolder: state.currentFolder?.id === id ? folder : state.currentFolder,
                            isLoading: false,
                            showSuccess: true,
                        }))

                        setTimeout(() => set({ showSuccess: false }), 3000)
                    } catch (error) {
                        set({
                            error: error instanceof Error ? error.message : 'Unknown error occurred',
                            isLoading: false,
                        })
                    }
                },

                clearError: () => set({ error: null }),
                clearCurrentFolder: () => set({ currentFolder: null }),
                setCurrentFolder: (folder: FolderWithJobs | null) => set({ currentFolder: folder }),
                refreshFolders: async () => {
                    await get().fetchFolders()
                },
            }),
            {
                name: 'folders-storage',
                partialize: (state) => ({
                    folders: state.folders,
                    currentFolder: state.currentFolder,
                }),
            }
        ),
        { name: 'folders-store' }
    )
)
