import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { KnownFace } from '@shared/types/face'
import type { UnknownFace } from '@shared/types/unknownFace'
import { apiClient } from '../services/api'

interface PaginationData {
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

interface FacesState {
  unknownFaces: UnknownFace[]
  knownFaces: KnownFace[]
  loading: boolean
  selectedFaces: Set<string>
  labelMode: 'existing' | 'new'
  selectedKnownFace: string
  newFaceName: string
  isLabeling: boolean
  activeTab: string
  successMessage: string | null
  unknownPagination: PaginationData
  knownPagination: PaginationData

  currentKnownFace: KnownFace | null

  fetchUnknownFaces: (page?: number) => Promise<void>
  fetchKnownFaceImages: (name: string) => Promise<void>
  fetchKnownFaces: (page?: number) => Promise<void>
  fetchData: () => Promise<void>
  handleUnknownPageChange: (newPage: number) => void
  handleKnownPageChange: (newPage: number) => void
  handleSelectFace: (image_hash: string) => void
  handleSelectAll: () => void
  handleLabelFaces: () => Promise<void>
  handleDeleteUnknownFace: (face: UnknownFace) => Promise<void>
  setLabelMode: (mode: 'existing' | 'new') => void
  setSelectedKnownFace: (name: string) => void
  setNewFaceName: (name: string) => void
  setActiveTab: (tab: string) => void
  clearSuccessMessage: () => void

  handleRenameKnownFace: (oldName: string, newName: string) => Promise<void>

  renameCurrentFace: (name: string) => void

  handleDeleteKnownFace: (name: string) => Promise<void>
}

export const useFacesStore = create<FacesState>()(
  devtools(
    persist(
      (set, get) => ({
        unknownFaces: [],
        knownFaces: [],
        loading: true,
        selectedFaces: new Set(),
        labelMode: 'existing',
        selectedKnownFace: '',
        newFaceName: '',
        isLabeling: false,
        activeTab: 'unknown',
        successMessage: null,
        currentKnownFace: null,
        unknownPagination: {
          total: 0,
          page: 1,
          totalPages: 0,
          hasMore: false,
        },
        knownPagination: {
          total: 0,
          page: 1,
          totalPages: 0,
          hasMore: false,
        },

        fetchKnownFaceImages: async (name) => {
          set({ loading: true })
          try {
            const data = await apiClient.faces.known.images(name)

            set({
              currentKnownFace: data,
              loading: false,
            })
          } catch (error) {
            console.error('Error fetching face images:', error)
            set({ loading: false })
          }
        },
        fetchUnknownFaces: async (page = 1) => {
          set({ loading: true })
          try {
            const data = await apiClient.faces.unknown.list(page)

            set({
              unknownFaces: data.faces,
              unknownPagination: {
                total: data.total,
                page: data.page,
                totalPages: data.totalPages,
                hasMore: data.hasMore,
              },
              loading: false,
            })
          } catch (error) {
            console.error('Error fetching unknown faces:', error)
            set({ loading: false })
          }
        },
        fetchKnownFaces: async (page = 1) => {
          set({ loading: true })
          try {
            const data = await apiClient.faces.known.list(page)

            set({
              knownFaces: data.faces,
              knownPagination: {
                total: data.total,
                page: data.page,
                totalPages: data.totalPages,
                hasMore: data.hasMore,
              },
              loading: false,
            })
          } catch (error) {
            console.error('Error fetching known faces:', error)
            set({ loading: false })
          }
        },

        fetchData: async () => {
          const state = get()
          await Promise.all([
            state.fetchUnknownFaces(state.unknownPagination.page),
            state.fetchKnownFaces(state.knownPagination.page),
          ])
        },

        handleUnknownPageChange: (newPage: number) => {
          set({ selectedFaces: new Set() })
          get().fetchUnknownFaces(newPage)
        },

        handleKnownPageChange: (newPage: number) => {
          get().fetchKnownFaces(newPage)
        },

        handleSelectFace: (image_hash: string) => {
          set((state) => {
            const newSelection = new Set(state.selectedFaces)
            if (newSelection.has(image_hash)) {
              newSelection.delete(image_hash)
            } else {
              newSelection.add(image_hash)
            }
            return { selectedFaces: newSelection }
          })
        },

        handleSelectAll: () => {
          set((state) => {
            if (state.selectedFaces.size === state.unknownFaces.length) {
              return { selectedFaces: new Set() }
            } else {
              return { selectedFaces: new Set(state.unknownFaces.map((face) => face.image_hash)) }
            }
          })
        },

        handleLabelFaces: async () => {
          const state = get()

          if (state.selectedFaces.size === 0) {
            return
          }

          const targetName = state.labelMode === 'existing' ? state.selectedKnownFace : state.newFaceName.trim()

          if (!targetName) {
            return
          }

          set({ isLabeling: true, successMessage: null })

          try {
            const selectedFacesArray = Array.from(state.selectedFaces)
            const facesToLabel = selectedFacesArray
              .map((image_hash) => {
                const face = state.unknownFaces.find((f) => f.image_hash === image_hash)
                if (face) {
                  return {
                    jsonFile: face.json_file,
                    faceId: face.face_id,
                  }
                }
                return null
              })
              .filter((face): face is { jsonFile: string; faceId: string } => face !== null)

            const result = await apiClient.faces.label(facesToLabel, targetName)

            const { labeledCount } = result

            if (labeledCount > 0) {
              set({
                successMessage: `Successfully labeled ${labeledCount} face(s) as "${targetName}". Automatic matching is now running in the background to find similar faces.`,
              })
            }

            set({
              selectedFaces: new Set(),
              newFaceName: '',
              selectedKnownFace: '',
            })

            await get().fetchData()
          } catch (error) {
            console.error('Error labeling faces:', error)
          } finally {
            set({ isLabeling: false })
          }
        },

        handleDeleteUnknownFace: async (face: UnknownFace) => {
          try {
            await apiClient.faces.unknown.delete(face.image_file, face.json_file)

            set((state) => ({
              unknownFaces: state.unknownFaces.filter(
                (f) => f.json_file !== face.json_file && face.image_file !== f.image_file
              ),
              selectedFaces: new Set(Array.from(state.selectedFaces).filter((hash) => hash !== face.image_hash)),
              successMessage: 'Face deleted successfully.',
            }))
          } catch (error) {
            console.error('Error deleting face:', error)
          }
        },

        handleRenameKnownFace: async (oldName: string, newName: string) => {
          try {
            await apiClient.faces.known.rename(oldName, newName)

            set({
              successMessage: `Successfully renamed "${oldName}" to "${newName}"`,
            })

            await get().fetchKnownFaceImages(newName)
          } catch (error) {
            console.error('Error renaming face:', error)
            throw error
          }
        },

        handleDeleteKnownFace: async (name: string) => {
          try {
            await apiClient.faces.known.delete(name)

            set({
              successMessage: `Successfully deleted "${name}"`,
            })

            await get().fetchData()
          } catch (error) {
            console.error('Error deleting known face:', error)
            throw error
          }
        },

        setLabelMode: (mode) => set({ labelMode: mode }),
        setSelectedKnownFace: (name) => set({ selectedKnownFace: name }),
        setNewFaceName: (name) => set({ newFaceName: name }),
        setActiveTab: (tab) => set({ activeTab: tab }),
        clearSuccessMessage: () => set({ successMessage: null }),
        renameCurrentFace: (name) =>
          set({
            newFaceName: name,
          }),
      }),
      {
        name: 'faces-storage',
        partialize: (state) => ({
          knownFaces: state.knownFaces,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'faces-store' }
  )
)
