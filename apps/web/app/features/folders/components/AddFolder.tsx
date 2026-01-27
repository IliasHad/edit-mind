import { motion } from 'framer-motion'
import { FolderIcon, PlusIcon, ArrowPathIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'
import { Modal } from '@ui/components/Modal'
import { useMediaBrowser } from '../hooks/useMediaBrowser'
import { useEffect } from 'react'

interface AddFolderProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (path: string) => Promise<boolean>
  error: string | null
}

export function AddFolder({ isOpen, onClose, onAdd, error }: AddFolderProps) {
  const { currentPath, folders, loading, selectedPath, setSelectedPath, navigateToFolder, fetchFolders, reset } =
    useMediaBrowser()

  useEffect(() => {
    if (isOpen) {
      fetchFolders()
    }
    return reset()
  }, [fetchFolders, reset, isOpen])

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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">Add Folder</h2>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1 truncate">
            Select a folder on your server to be indexed.
          </p>
        </div>
      </div>
      {error && (
        <div className="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="px-6 block py-3text-sm text-red-500 truncate">{error}</div>
          </div>
        </div>
      )}
      <div className="px-6 my-2 py-3 flex items-center gap-2 overflow-x-auto text-sm text-black/60 dark:text-white/60 border-b border-black/5 dark:border-white/5">
        {getBreadcrumbs().map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center gap-2 shrink-0">
            <Button onClick={() => navigateToFolder(crumb.path)} variant="ghost">
              {crumb.name}
            </Button>
            {idx < getBreadcrumbs().length - 1 && <ChevronRightIcon className="size-3" />}
          </div>
        ))}
      </div>

      <div className="flex-1 max-h-72 overflow-y-auto px-6 py-3 space-y-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <ArrowPathIcon className="size-6 animate-spin text-black/40 dark:text-white/40" />
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-16 text-black/40 dark:text-white/40">
            <FolderIcon className="size-10 mx-auto mb-3" />
            <p className="text-sm">No folders found</p>
          </div>
        ) : (
          folders.map((folder) => (
            <motion.div
              key={folder.path}
              layout
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                selectedPath === folder.path ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/2 dark:hover:bg-white/2'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => navigateToFolder(folder.path)}>
                <FolderIcon className="size-5 text-black/60 dark:text-white/60 shrink-0" />
                <span className="text-sm text-black dark:text-white truncate">{folder.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectFolder(folder.path)
                  }}
                  variant={selectedPath === folder.path ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {selectedPath === folder.path ? 'Selected' : 'Select'}
                </Button>
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
        <Button
          onClick={handleAddFolder}
          disabled={!selectedPath || loading}
          loading={loading}
          leftIcon={loading ? <ArrowPathIcon className="size-4" /> : <PlusIcon className="size-4" />}
        >
          Add Folder
        </Button>
        <Button variant="secondary" onClick={handleAddFolder} disabled={!selectedPath || loading} loading={loading} aria-label='Cancel'>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
