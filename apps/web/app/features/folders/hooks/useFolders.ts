import { useEffect } from 'react'
import { useFoldersStore } from '../stores'

export const useFolders = () => {
    const { fetchFolders, folders, isLoading, error } = useFoldersStore()

    useEffect(() => {
        fetchFolders()
    }, [fetchFolders])

    return {
        fetchFolders,
        folders,
        loading: isLoading,
        error,
    }
}
