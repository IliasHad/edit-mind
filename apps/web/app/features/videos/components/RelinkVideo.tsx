import { useState, useEffect } from 'react'
import { ArrowRightIcon, FolderIcon, VideoCameraIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@ui/components/Button'
import { Modal } from '@ui/components/Modal'
import { useMediaBrowser } from '~/features/folders/hooks/useMediaBrowser'
import { ChevronRightIcon } from '@heroicons/react/24/solid'

interface RelinkVideoProps {
  isOpen: boolean
  oldSource: string
  onClose: () => void
  onRelink: (newSource: string) => Promise<void>
  relinkSuccess?: boolean
}

export function RelinkVideo({ isOpen, oldSource, onClose, onRelink, relinkSuccess }: RelinkVideoProps) {
  const { currentPath, folders, files, isLoading, error, selectedPath, setSelectedPath, navigateToFolder, reset } =
    useMediaBrowser()

  const [isRelinking, setIsRelinking] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      reset()
      navigateToFolder('/')
    }
  }, [isOpen, reset, navigateToFolder])

  useEffect(() => {
    if (relinkSuccess) {
      onClose()
    }
  }, [relinkSuccess, onClose])

  const handleItemClick = (item: { path: string; isDirectory: boolean }) => {
    if (item.isDirectory) {
      navigateToFolder(item.path)
    } else {
      setSelectedPath(item.path)
    }
  }

  const handleRelink = async () => {
    if (!selectedPath) return
    setIsRelinking(true)
    try {
      await onRelink(selectedPath)
    } catch (error) {
      console.error('Relink error:', error)
    } finally {
      setIsRelinking(false)
    }
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

  const filteredFolders = searchTerm
    ? folders.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : folders

  const filteredFiles = searchTerm
    ? files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : files

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="px-6 py-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">Relink Video</h2>
          <p className="text-sm text-white/60 mt-1">Select a new video file to replace the missing source</p>
          {oldSource && <p className="text-xs text-white/40 mt-2 font-mono truncate">Previous: {oldSource}</p>}
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

      <div className="px-6 py-3 border-b border-white/5">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 max-h-72 overflow-y-auto px-6 py-3 space-y-1 min-h-0">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <FolderIcon className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No files or folders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredFolders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <h3 className="text-xs font-medium text-white/40 px-3 mb-2">Folders</h3>
                  {filteredFolders.map((folder) => (
                    <motion.button
                      key={folder.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleItemClick(folder)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderIcon className="w-5 h-5 text-white/60 shrink-0" />
                        <span className="text-sm text-white truncate text-left">{folder.name}</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {filteredFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <h3 className="text-xs font-medium text-white/40 px-3 mb-2">Video Files</h3>
                  {filteredFiles.map((file) => (
                    <motion.button
                      key={file.path}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleItemClick(file)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedPath === file.path ? 'bg-white/10 ring-2 ring-white/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <VideoCameraIcon className="w-5 h-5 text-white/60 shrink-0" />
                        <span className="text-sm text-white truncate text-left">{file.name}</span>
                      </div>
                      {selectedPath === file.path && (
                        <div className="px-2.5 py-1 bg-white text-black rounded-md text-xs font-medium shrink-0">
                          Selected
                        </div>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selectedPath && (
        <div className="px-6 py-3 border-t border-white/10">
          <p className="text-xs text-white/40 mb-1">New source:</p>
          <p className="text-sm font-mono text-white truncate">{selectedPath}</p>
        </div>
      )}

      <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
        <Button onClick={onClose} disabled={isRelinking} variant="ghost">
          Cancel
        </Button>
        <Button onClick={handleRelink} disabled={!selectedPath || isRelinking} loading={isRelinking} variant="primary">
          Relink Video
        </Button>
      </div>
    </Modal>
  )
}
