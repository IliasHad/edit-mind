import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckIcon,
  FolderIcon,
  LinkIcon,
  VideoCameraIcon,
  ViewfinderCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@ui/components/Button'

interface ServerFolder {
  path: string
  name: string
  isDirectory: boolean
  children?: ServerFolder[]
}

interface RelinkVideoProps {
  isOpen: boolean
  oldSource: string
  onClose: () => void
  onRelink: (oldSource: string, newSource: string) => Promise<void>
  relinkSuccess: boolean
}

export function RelinkVideo({ isOpen, oldSource, onClose, onRelink, relinkSuccess }: RelinkVideoProps) {
  const [availableFolders, setAvailableFolders] = useState<ServerFolder[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedPath, setSelectedPath] = useState('')
  const [isRelinking, setIsRelinking] = useState(false)

  const fetchAvailableFolders = useCallback(
    async (path: string = '/') => {
      setLoadingFolders(true)
      try {
        const response = await fetch(
          `/api/files?path=${encodeURIComponent(path)}&oldSource=${encodeURIComponent(oldSource)}`
        )
        const data = await response.json()
        setAvailableFolders(data.folders || [])
        setCurrentPath(path)
      } catch (error) {
        console.error(error)
        setAvailableFolders([])
      } finally {
        setLoadingFolders(false)
      }
    },
    [oldSource]
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedPath('')
      setCurrentPath('/')
      fetchAvailableFolders('/')
    }
  }, [isOpen, fetchAvailableFolders])

  const handleNavigateToFolder = (folderPath: string) => {
    fetchAvailableFolders(folderPath)
  }

  const handleItemClick = (item: ServerFolder) => {
    if (item.isDirectory) {
      // Navigate into folder
      handleNavigateToFolder(item.path)
    } else {
      // Select video file
      setSelectedPath(item.path)
    }
  }

  const handleRelink = async () => {
    if (!selectedPath) return
    setIsRelinking(true)
    try {
      await onRelink(oldSource, selectedPath)
      onClose()
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

  // Separate folders and files for better organization
  const folders = availableFolders.filter((item) => item.isDirectory)
  const files = availableFolders.filter((item) => !item.isDirectory)

  if (relinkSuccess)
    return (
      <AnimatePresence>
        {relinkSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 dark:border-green-500/20 rounded-xl flex items-center gap-3"
          >
            <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-900 dark:text-green-100">Video successfully relinked</span>
          </motion.div>
        )}
      </AnimatePresence>
    )
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
                <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                  <LinkIcon className="size-5" />
                  Relink Video
                </h2>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  Select a new video file to replace the missing source
                </p>
                {oldSource && (
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1 font-mono truncate">
                    Previous: {oldSource}
                  </p>
                )}
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon-sm"
                leftIcon={<XCircleIcon className="size-4 text-black/40 dark:text-white/40" />}
              />
            </div>

            <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto text-sm text-black/60 dark:text-white/60 border-b border-black/5 dark:border-white/5">
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => handleNavigateToFolder(crumb.path)}
                    variant="ghost"
                    className="whitespace-nowrap hover:text-black dark:hover:text-white"
                  >
                    {crumb.name}
                  </Button>
                  {idx < getBreadcrumbs().length - 1 && <ArrowRightIcon className="size-3" />}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-16">
                  <ViewfinderCircleIcon className="size-6 animate-spin text-black/40 dark:text-white/40" />
                </div>
              ) : availableFolders.length === 0 ? (
                <div className="text-center py-16 text-black/40 dark:text-white/40">
                  <FolderIcon className="size-10 mx-auto mb-3" />
                  <p className="text-sm">No files or folders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.length > 0 && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-black/40 dark:text-white/40 px-3 mb-2">Folders</h3>
                      {folders.map((folder) => (
                        <Button
                          key={folder.path}
                          layout
                          onClick={() => handleItemClick(folder)}
                          variant="ghost"
                          className="w-full flex items-center justify-between p-3"
                          leftIcon={<FolderIcon className="size-5 text-black/60 dark:text-white/60 shrink-0" />}
                          rightIcon={<ArrowRightIcon className="size-4 text-black/30 dark:text-white/30" />}
                        >
                          <span className="text-sm text-black dark:text-white truncate text-left">{folder.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-black/40 dark:text-white/40 px-3 mb-2">Video Files</h3>
                      {files.map((file) => (
                        <Button
                          key={file.path}
                          layout
                          onClick={() => handleItemClick(file)}
                          variant="ghost"
                          className={`w-full flex items-center justify-between p-3 ${
                            selectedPath === file.path
                              ? 'bg-black/10 dark:bg-white/10 ring-2 ring-black/20 dark:ring-white/20'
                              : ''
                          }`}
                          leftIcon={<VideoCameraIcon className="size-5 text-black/60 dark:text-white/60 shrink-0" />}
                        >
                          <span className="text-sm text-black dark:text-white truncate text-left">{file.name}</span>
                          {selectedPath === file.path && (
                            <div className="px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black rounded-md text-xs font-medium shrink-0">
                              Selected
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedPath && (
              <div className="px-6 py-3 border-t border-black/10 dark:border-white/10">
                <p className="text-xs text-black/40 dark:text-white/40 mb-1">New source:</p>
                <p className="text-sm font-mono text-black dark:text-white truncate">{selectedPath}</p>
              </div>
            )}

            <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-3">
              <Button
                onClick={onClose}
                disabled={isRelinking}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRelink}
                disabled={!selectedPath || isRelinking}
                loading={isRelinking}
                leftIcon={isRelinking ? <ViewfinderCircleIcon className="size-4" /> : <LinkIcon className="size-4" />}
              >
                Relink Video
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
