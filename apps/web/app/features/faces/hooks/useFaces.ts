import { useEffect } from 'react'
import { useFacesStore } from '../stores'

export function useFaces() {
  const {
    unknownFaces,
    knownFaces,
    loading,
    unknownPagination,
    knownPagination,
    setActiveTab,
    fetchData,
    handleKnownPageChange,
    selectedFaces,
    handleSelectFace,
    handleDeleteUnknownFace,
    handleUnknownPageChange,
  } = useFacesStore()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    unknownFaces,
    knownFaces,
    loading,
    unknownPagination,
    knownPagination,
    setActiveTab,
    handleKnownPageChange,
    selectedFaces,
    handleSelectFace,
    handleDeleteUnknownFace,
    handleUnknownPageChange,
  }
}
