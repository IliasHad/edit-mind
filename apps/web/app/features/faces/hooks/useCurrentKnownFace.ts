import { useEffect } from 'react'
import { useFacesStore } from '../stores'
import { useParams } from 'react-router'

export function useCurrentKnowFace() {
  const {
    loading,
    fetchKnownFaceImages,
    currentKnownFace,
    handleRenameKnownFace,
    renameCurrentFace,
    newFaceName,
    setNewFaceName,
  } = useFacesStore()
  const { name } = useParams()

  useEffect(() => {
    if (name) fetchKnownFaceImages(name)
  }, [fetchKnownFaceImages, name])

  return {
    loading,
    currentKnownFace,
    handleRenameKnownFace,
    renameCurrentFace,
    newFaceName,
    setNewFaceName,
  }
}
