import { useState, useEffect, useCallback } from 'react'
import type { UnknownFace, KnownFace } from '@shared/types/face'


interface PaginationData {
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export const useTraining = () => {
  const [unknownFaces, setUnknownFaces] = useState<UnknownFace[]>([])
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set())
  const [labelMode, setLabelMode] = useState<'existing' | 'new'>('existing')
  const [selectedKnownFace, setSelectedKnownFace] = useState<string>('')
  const [newFaceName, setNewFaceName] = useState<string>('')
  const [isLabeling, setIsLabeling] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('unknown')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [unknownPagination, setUnknownPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    totalPages: 0,
    hasMore: false,
  })
  const [knownPagination, setKnownPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    totalPages: 0,
    hasMore: false,
  })

  const fetchUnknownFaces = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/faces/unknown?page=${page}&limit=40`)
      if (!response.ok) throw new Error('Failed to fetch unknown faces')
      const data = await response.json()
      setUnknownFaces(data.faces)
      setUnknownPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        hasMore: data.hasMore,
      })
    } catch (error) {
      console.error('Error fetching unknown faces:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKnownFaces = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/faces/known?page=${page}&limit=40`)
      if (!response.ok) throw new Error('Failed to fetch known faces')
      const data = await response.json()

      if (Array.isArray(data.faces)) {
        setKnownFaces(data.faces)
      } else {
        const knownFacesArray = Object.entries(data.faces).map(([name, image]) => ({
          name,
          image: image as string,
        }))
        setKnownFaces(knownFacesArray)
      }

      setKnownPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        hasMore: data.hasMore,
      })
    } catch (error) {
      console.error('Error fetching known faces:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    await Promise.all([fetchUnknownFaces(unknownPagination.page), fetchKnownFaces(knownPagination.page)])
  }, [fetchUnknownFaces, fetchKnownFaces, unknownPagination.page, knownPagination.page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUnknownPageChange = useCallback(
    (newPage: number) => {
      setSelectedFaces(new Set()) // Clear selections when changing page
      fetchUnknownFaces(newPage)
    },
    [fetchUnknownFaces]
  )

  const handleKnownPageChange = useCallback(
    (newPage: number) => {
      fetchKnownFaces(newPage)
    },
    [fetchKnownFaces]
  )

  const handleSelectFace = useCallback((image_hash: string) => {
    setSelectedFaces((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(image_hash)) {
        newSelection.delete(image_hash)
      } else {
        newSelection.add(image_hash)
      }
      return newSelection
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedFaces.size === unknownFaces.length) {
      setSelectedFaces(new Set())
    } else {
      setSelectedFaces(new Set(unknownFaces.map((face) => face.image_hash)))
    }
  }, [selectedFaces.size, unknownFaces])

  const handleLabelFaces = useCallback(async () => {
    if (selectedFaces.size === 0) {
      return
    }

    const targetName = labelMode === 'existing' ? selectedKnownFace : newFaceName.trim()

    if (!targetName) {
      return
    }

    setIsLabeling(true)

    setSuccessMessage(null)

    try {
      const selectedFacesArray = Array.from(selectedFaces)
      const facesToLabel = selectedFacesArray
        .map((image_hash) => {
          const face = unknownFaces.find((f) => f.image_hash === image_hash)
          if (face) {
            return {
              jsonFile: face.json_file,
              faceId: face.face_id,
            }
          }
          return null
        })
        .filter((face): face is { jsonFile: string; faceId: string } => face !== null)

      const response = await fetch('/api/faces/label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faces: facesToLabel,
          name: targetName,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to label faces')
      }

      const { labeledCount } = result

      if (labeledCount > 0) {
        setSuccessMessage(
          `Successfully labeled ${labeledCount} face(s) as "${targetName}". 
        Automatic matching is now running in the background to find similar faces.`
        )
      }

      setSelectedFaces(new Set())
      setNewFaceName('')
      setSelectedKnownFace('')

      await fetchData()
    } catch (error) {
      console.error('Error labeling faces:', error)
    } finally {
      setIsLabeling(false)
    }
  }, [selectedFaces, labelMode, selectedKnownFace, newFaceName, unknownFaces, fetchData])

  const handleDeleteUnknownFace = useCallback(async (face: UnknownFace) => {
    try {
      const response = await fetch('/api/faces/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageFile: face.image_file,
          jsonFile: face.json_file,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error('Failed to delete face')
      }

      setUnknownFaces((prev) => prev.filter((f) => f.face_id !== face.face_id))
      setSelectedFaces((prev) => {
        const newSelection = new Set(prev)
        newSelection.delete(face.image_hash)
        return newSelection
      })

      setSuccessMessage('Face deleted successfully.')
    } catch (error) {
      console.error('Error deleting face:', error)
    }
  }, [])

  return {
    unknownFaces,
    knownFaces,
    loading,
    selectedFaces,
    labelMode,
    selectedKnownFace,
    newFaceName,
    isLabeling,
    activeTab,
    successMessage,
    unknownPagination,
    knownPagination,
    setLabelMode,
    setSelectedKnownFace,
    setNewFaceName,
    setActiveTab,
    handleSelectFace,
    handleSelectAll,
    handleLabelFaces,
    handleDeleteUnknownFace,
    handleUnknownPageChange,
    handleKnownPageChange,
  }
}
