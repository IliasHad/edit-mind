import type { Job, JobStatus } from '@prisma/client'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface JobsState {
    jobs: Job[]
    currentJob: Job | null
    isLoading: boolean
    error: string | null

    jobsStatus: Record<JobStatus, number>

    fetchJobs: () => Promise<void>
    fetchJobsByFolderId: (folderId: string) => Promise<void>

    fetchJobById: (id: string) => Promise<Job | null>
    deleteJob: (id: string) => Promise<void>
    retryJob: (id: string) => Promise<void>

    updateJobProgress: (id: string, progress: Partial<Job>) => void

    clearError: () => void
    clearCurrentJob: () => void
    setCurrentJob: (job: Job | null) => void
    refreshJobs: () => Promise<void>

    page: number

    total: number

    totalPages: number

    hasMore: boolean

    limit: number
}

export const useJobsStore = create<JobsState>()(
    devtools(
        (set, get) => ({
            jobs: [],
            currentJob: null,
            isLoading: false,
            error: null,
            page: 1,
            limit: 20,
            totalPages: 0,

            fetchJobs: async () => {
                set({ isLoading: true, error: null })
                try {
                    const response = await fetch('/api/jobs')

                    if (!response.ok) {
                        throw new Error(`Failed to fetch jobs: ${response.statusText}`)
                    }

                    const { jobs, page, total, limit, hasMore, totalPages, jobsStatus } = await response.json()

                    set({ jobs, isLoading: false, page, total, limit, hasMore, totalPages, jobsStatus })
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        isLoading: false,
                    })
                }
            },

            fetchJobsByFolderId: async (folderId: string) => {
                set({ isLoading: true, error: null })
                try {
                    const response = await fetch(`/api/folders/${folderId}/jobs`)

                    if (!response.ok) {
                        throw new Error(`Failed to fetch jobs: ${response.statusText}`)
                    }

                    const { jobs, page, total, limit, hasMore, totalPages, jobsStatus } = await response.json()

                    set({ jobs, isLoading: false, page, total, limit, hasMore, totalPages, jobsStatus })
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        isLoading: false,
                    })
                }
            },

            fetchJobById: async (id: string) => {
                set({ isLoading: true, error: null })
                try {
                    const response = await fetch(`/api/jobs/${id}`)

                    if (!response.ok) {
                        throw new Error(`Failed to fetch job: ${response.statusText}`)
                    }

                    const { job } = await response.json()

                    set({
                        currentJob: job,
                        isLoading: false,
                    })
                    return job
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        isLoading: false,
                        currentJob: null,
                    })
                    return null
                }
            },

            deleteJob: async (id: string) => {
                set({ isLoading: true, error: null })
                try {
                    const response = await fetch(`/api/jobs/${id}`, {
                        method: 'DELETE',
                    })

                    if (!response.ok) {
                        throw new Error(`Failed to delete job: ${response.statusText}`)
                    }

                    set((state) => ({
                        jobs: state.jobs.filter((j) => j.id !== id),
                        currentJob: state.currentJob?.id === id ? null : state.currentJob,
                        isLoading: false,
                    }))
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        isLoading: false,
                    })
                }
            },

            retryJob: async (id: string) => {
                set({ isLoading: true, error: null })
                try {
                    const response = await fetch(`/api/jobs/${id}/retry`, {
                        method: 'POST',
                    })

                    if (!response.ok) {
                        throw new Error(`Failed to retry job: ${response.statusText}`)
                    }

                    const { job } = await response.json()

                    set((state) => ({
                        jobs: state.jobs.map((j) => (j.id === id ? job : j)),
                        currentJob: state.currentJob?.id === id ? job : state.currentJob,
                        isLoading: false,
                    }))
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        isLoading: false,
                    })
                }
            },

            updateJobProgress: (id: string, progress: Partial<Job>) => {
                set((state) => ({
                    jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...progress } : j)),
                    currentJob: state.currentJob?.id === id ? { ...state.currentJob, ...progress } : state.currentJob,
                }))
            },

            clearError: () => set({ error: null }),
            clearCurrentJob: () => set({ currentJob: null }),
            setCurrentJob: (job: Job | null) => set({ currentJob: job }),
            refreshJobs: async () => {
                await get().fetchJobs()
            },
        }),
        { name: 'jobs-store' }
    )
)
