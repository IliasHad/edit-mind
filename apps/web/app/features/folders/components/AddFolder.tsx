import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderIcon, PlusIcon, ArrowPathIcon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import type { ServerFolder } from '@shared/types/folder'

interface AddFolderProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (path: string) => Promise<boolean>
  error: string | null
  loading: boolean
}

export function AddFolder({ isOpen, onClose, onAdd, loading, error }: AddFolderProps) {
  const [availableFolders, setAvailableFolders] = useState<ServerFolder[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedPath, setSelectedPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAvailableFolders = useCallback(
    async (path: string = '/') => {
      setLoadingFolders(true)
      try {
        const params = new URLSearchParams({ path, search: searchQuery })
        const response = await fetch(`/api/media/folders?${params.toString()}`)
        const data = await response.json()
        setAvailableFolders(data.folders?.filter((f: ServerFolder) => f.isDirectory) || [])
        setCurrentPath(path)
      } catch (error) {
        console.error(error)
        setAvailableFolders([])
      } finally {
        setLoadingFolders(false)
      }
    },
    [searchQuery]
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedPath('')
      setSearchQuery('')
      setCurrentPath('/')
      fetchAvailableFolders('/')
    }
  }, [fetchAvailableFolders, isOpen])

  useEffect(() => {
    if (isOpen) fetchAvailableFolders(currentPath)
  }, [searchQuery, currentPath, isOpen, fetchAvailableFolders])

  const handleNavigateToFolder = (folderPath: string) => {
    fetchAvailableFolders(folderPath)
  }

  const handleSelectFolder = (folderPath: string) => {
    setSelectedPath(folderPath)
  }

  const handleAddFolder = async () => {
    if (!selectedPath) return
    await onAdd(selectedPath)
  }

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [{ name: 'Root', path: '/' }]
    const parts = currentPath.split('/').filter(Boolean)
    return [
      { name: 'Root', path: '/' },
      ...parts.map((part, idx) => ({
        name: part,
        path: '/' + parts.slice(0, idx + 1).join('/'),
      })),
    ]
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-black rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-black/10 dark:border-white/10"
          >
            <div className="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-black dark:text-white">Add Folder</h2>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1 truncate">
                  Select a folder on your server to be indexed.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
              >
                <XMarkIcon className="size-4 text-black/40 dark:text-white/40" />
              </button>
            </div>
            {error && (
              <div className="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="px-6 block py-3text-sm text-red-500 truncate">
                    {error}
                  </div>
                </div>
              </div>
            )}
            <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto text-sm text-black/60 dark:text-white/60 border-b border-black/5 dark:border-white/5">
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleNavigateToFolder(crumb.path)}
                    className="whitespace-nowrap hover:text-black dark:hover:text-white transition-colors"
                  >
                    {crumb.name}
                  </button>
                  {idx < getBreadcrumbs().length - 1 && <ChevronRightIcon className="size-3" />}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1 min-h-0">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="size-6 animate-spin text-black/40 dark:text-white/40" />
                </div>
              ) : availableFolders.length === 0 ? (
                <div className="text-center py-16 text-black/40 dark:text-white/40">
                  <FolderIcon className="size-10 mx-auto mb-3" />
                  <p className="text-sm">No folders found</p>
                </div>
              ) : (
                availableFolders.map((folder) => (
                  <motion.div
                    key={folder.path}
                    layout
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedPath === folder.path
                        ? 'bg-black/5 dark:bg-white/5'
                        : 'hover:bg-black/2 dark:hover:bg-white/2'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0"
                      onClick={() => handleNavigateToFolder(folder.path)}
                    >
                      <FolderIcon className="size-5 text-black/60 dark:text-white/60 shrink-0" />
                      <span className="text-sm text-black dark:text-white truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectFolder(folder.path)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedPath === folder.path
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                      >
                        {selectedPath === folder.path ? 'Selected' : 'Select'}
                      </button>
                      <ChevronRightIcon className="size-4 text-black/30 dark:text-white/30" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {selectedPath && (
              <div className="px-6 py-3 border-t border-black/10 dark:border-white/10 text-sm text-black/60 dark:text-white/60 truncate">
                Selected: <span className="font-mono text-black dark:text-white">{selectedPath}</span>
              </div>
            )}

            <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl font-medium text-sm text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!selectedPath || loading}
                className="flex items-center gap-2 px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-4" />
                    Add Folder
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
