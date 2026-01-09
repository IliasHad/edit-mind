import type { Project, Video } from '@prisma/client'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ProjectCreateInput, ProjectUpdateInput } from '../schemas'

type ProjectWithVideos = Project & {
  videos: {
    id: string
  }[]
  _count?: {
    videos: number
  }
}
interface VideoWithFolderPath extends Video {
  folder: {
    path: string
  }
}
interface ProjectsState {
  projects: ProjectWithVideos[]
  currentProject: ProjectWithVideos | null
  isLoading: boolean
  availableVideos: VideoWithFolderPath[]
  error: string | null
  showSuccess?: boolean
  fetchProjects: () => Promise<void>
  fetchProjectById: (id: string) => Promise<ProjectWithVideos | null>
  deleteProject: (id: string) => Promise<void>
  createProject: (input: ProjectCreateInput) => Promise<ProjectWithVideos | null>
  updateProject: (id: string, input: ProjectUpdateInput) => Promise<ProjectWithVideos | null>
  clearError: () => void
  clearCurrentProject: () => void

  refreshProjects: () => Promise<void>
  setCurrentProject: (project: ProjectWithVideos | null) => void
  fetchAvailableVideos: () => Promise<void>
}

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        currentProject: null,
        isLoading: false,
        error: null,
        availableVideos: [],
        showSuccess: false,

        fetchProjects: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/projects')

            if (!response.ok) {
              throw new Error(`Failed to fetch projects: ${response.statusText}`)
            }

            const { projects } = await response.json()

            set({ projects, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
          }
        },

        fetchAvailableVideos: async () => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/videos')

            if (!response.ok) {
              throw new Error(`Failed to fetch videos: ${response.statusText}`)
            }

            const { videos } = await response.json()

            set({ availableVideos: videos, isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
          }
        },

        fetchProjectById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/projects/${id}`)

            if (!response.ok) {
              throw new Error(`Failed to fetch project: ${response.statusText}`)
            }

            const { project } = await response.json()

            set({
              currentProject: { ...project, videoIds: project.videos.map((video: Video) => video.id) },
              isLoading: false,
            })
            return project
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentProject: null,
            })
            return null
          }
        },

        deleteProject: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })

            if (!response.ok) {
              throw new Error(`Failed to fetch project: ${response.statusText}`)
            }

            set((state) => ({
              projects: state.projects.filter((p) => p.id !== id),
              currentProject: null,
              isLoading: false,
            }))
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
              currentProject: null,
            })
          }
        },

        createProject: async (input: ProjectCreateInput) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(input),
            })

            if (!response.ok) {
              throw new Error(`Failed to create project: ${response.statusText}`)
            }

            const { project } = await response.json()

            set((state) => ({
              projects: [...state.projects, project],
              isLoading: false,
              showSuccess: true,
            }))

            return project
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
            return null
          }
        },

        updateProject: async (id: string, input: ProjectUpdateInput) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`/api/projects/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(input),
            })

            if (!response.ok) {
              throw new Error(`Failed to update project: ${response.statusText}`)
            }

            const { project } = await response.json()

            // Update the project in the list
            set((state) => ({
              projects: state.projects.map((p) => (p.id === id ? project : p)),
              currentProject:
                state.currentProject?.id === id
                  ? { ...project, videoIds: project.videos.map((video: Video) => video.id) }
                  : state.currentProject,
              isLoading: false,
              showSuccess: true,
            }))

            return project
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              isLoading: false,
            })
            return null
          }
        },

        clearError: () => set({ error: null }),
        clearCurrentProject: () => set({ currentProject: null }),

        refreshProjects: async () => {
          await get().fetchProjects()
        },

        setCurrentProject: (project: ProjectWithVideos | null) => {
          set({ currentProject: project })
        },
      }),
      {
        name: 'projects-storage',
        partialize: (state) => ({
          projects: state.projects,
          currentProject: state.currentProject,
        }),
      }
    ),
    { name: 'projects-store' }
  )
)
