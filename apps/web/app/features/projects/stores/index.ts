import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ProjectCreateInput, ProjectUpdateInput } from '../schemas'
import type { ProjectWithVideosIds } from '../types';
import { apiClient } from '../services/api'

interface ProjectsState {
  projects: ProjectWithVideosIds[]
  currentProject: ProjectWithVideosIds | null
  isLoading: boolean
  error: string | null
  showSuccess?: boolean
  fetchProjects: () => Promise<void>
  fetchProjectById: (id: string) => Promise<ProjectWithVideosIds | null>
  deleteProject: (id: string) => Promise<void>
  createProject: (input: ProjectCreateInput) => Promise<ProjectWithVideosIds | null>
  updateProject: (id: string, input: ProjectUpdateInput) => Promise<ProjectWithVideosIds | null>
  clearError: () => void
  clearCurrentProject: () => void

  refreshProjects: () => Promise<void>
  setCurrentProject: (project: ProjectWithVideosIds | null) => void
}

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [],
        currentProject: null,
        isLoading: false,
        error: null,
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

        fetchProjectById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const { project } = await apiClient.get(id)

            set({
              currentProject: { ...project },
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
            await apiClient.delete(id)

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
            const { project } = await apiClient.create(input)

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
            const { project } = await apiClient.update(id, input)

            set((state) => ({
              projects: state.projects.map((p) => (p.id === id ? project : p)),
              currentProject:
                state.currentProject?.id === id
                  ? project
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

        setCurrentProject: (project: ProjectWithVideosIds | null) => {
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
