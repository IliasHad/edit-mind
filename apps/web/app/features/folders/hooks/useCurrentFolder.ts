import { useEffect } from 'react'
import { useFoldersStore } from '../stores'
import { useParams } from 'react-router'

export const useCurrentFolder = () => {
    const { id } = useParams()
    const {
        fetchFolderById,
        updateFolder,
        deleteFolder,
        isLoading,
        currentFolder,
        error,
        clearCurrentFolder,
        rescanFolder,
    } = useFoldersStore()

    useEffect(() => {
        if (id) {
            fetchFolderById(id)
        }
        return () => {
            clearCurrentFolder()
        }
    }, [clearCurrentFolder, fetchFolderById, id])

    return {
        fetchFolderById,
        updateFolder,
        deleteFolder,
        loading: isLoading,
        currentFolder,
        error,
        rescanFolder,
    }
}
