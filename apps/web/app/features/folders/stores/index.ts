import type { Folder, Job } from '@prisma/client'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type FolderWithJobs = Folder & {
    jobs: Job[]
}

export interface FolderCreateInput {
    path: string
    watcherEnabled?: boolean
    includePatterns?: string[]
    excludePatterns?: string[]
}

export interface FolderUpdateInput {
    watcherEnabled?: boolean
    includePatterns?: string[]
    excludePatterns?: string[]
}

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
                        const response = await fetch('/api/folders')

                        if (!response.ok) {
                            throw new Error(`Failed to fetch folders: ${response.statusText}`)
                        }

                        const { folders } = await response.json()

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
                        const response = await fetch(`/api/folders/${id}`)

                        if (!response.ok) {
                            throw new Error(`Failed to fetch folder: ${response.statusText}`)
                        }

                        const { folder } = await response.json()

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
                        const response = await fetch('/api/folders', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(input),
                        })

                        if (!response.ok) {
                            throw new Error(`Failed to create folder: ${response.statusText}`)
                        }

                        const { folder } = await response.json()

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
                        const response = await fetch(`/api/folders/${id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(input),
                        })

                        if (!response.ok) {
                            throw new Error(`Failed to update folder: ${response.statusText}`)
                        }

                        const { folder } = await response.json()

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
                        const response = await fetch(`/api/folders/${id}`, {
                            method: 'DELETE',
                        })

                        if (!response.ok) {
                            throw new Error(`Failed to delete folder: ${response.statusText}`)
                        }

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
                        const response = await fetch(`/api/folders/${id}/rescan`, {
                            method: 'POST',
                        })

                        if (!response.ok) {
                            throw new Error(`Failed to rescan folder: ${response.statusText}`)
                        }

                        const { folder } = await response.json()

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
