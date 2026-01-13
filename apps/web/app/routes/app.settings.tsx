import { Link } from 'react-router-dom'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  CircleStackIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction } from 'react-router'
import type { Folder } from '@prisma/client'
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AddFolder } from '~/features/folders/components/AddFolder'
import { humanizeSeconds, smartFormatDate } from '~/features/shared/utils/duration'
import { DeleteModal } from '~/features/shared/components/DeleteModal'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'
import { getStatusInfo } from '~/features/folders/utils'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useModal } from '~/features/shared/hooks/useModal'

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

export default function SettingsPage() {
  const { folders, createFolder, totalVideos, totalDuration } = useFolders()
    const { deleteFolder, setCurrentFolder, currentFolder } = useCurrentFolder()

  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal()
  const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal()


  const stats = useMemo(
    () => [
      {
        id: 'folders',
        icon: <FolderIcon className="size-5 text-black/60 dark:text-white/60" />,
        label: 'Total Folders',
        value: folders.length.toString(),
      },
      {
        id: 'videos',
        icon: <CheckCircleIcon className="size-5 text-black/60 dark:text-white/60" />,
        label: 'Videos Scanned',
        value: totalVideos.toString(),
      },
      {
        id: 'duration',
        icon: <ArrowUpTrayIcon className="size-5 text-black/60 dark:text-white/60" />,
        label: 'Total Processed Duration',
        value: humanizeSeconds(totalDuration),
      },
    ],
    [folders.length, totalVideos, totalDuration]
  )

  const handleOpenDeleteModal = (folder: Folder) => {
    setCurrentFolder({ ...folder, jobs: [] })
    openDeleteModal()
  }

  const handleAddFolder = async (path: string): Promise<boolean> => {
    try {
      await createFolder({ path })
      return true
    } catch (error) {
      console.error('Failed to add folder:', error)
      return false
    }
  }

  const handleDeleteFolder = async () => {
    if (!currentFolder) return

    try {
      await deleteFolder(currentFolder.id)
      setCurrentFolder(null)
      closeDeleteModal()
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const hasFolders = folders.length > 0

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <motion.main initial="hidden" animate="visible" className="max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <motion.header className="mb-12">
          <h1 className="text-3xl font-semibold text-black dark:text-white">Settings</h1>
          <p className="text-base text-black/50 dark:text-white/50 mt-1">Manage video folders to scan and index.</p>
        </motion.header>

        <motion.section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <motion.div
                key={stat.id}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-6 flex items-start gap-5"
              >
                <div className="p-3 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                  {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-black/60 dark:text-white/60">{stat.label}</p>
                  <p className="text-2xl font-semibold text-black dark:text-white mt-1">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">Video Folders</h2>
              <p className="text-sm text-black/50 dark:text-white/50">
                Add folders to automatically scan and index videos.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <PlusIcon className="size-4" />
              Add Folder
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {!hasFolders ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-20 px-6 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl"
                >
                  <FolderIcon className="size-12 mx-auto text-black/20 dark:text-white/20 mb-4" />
                  <h3 className="text-lg font-medium text-black dark:text-white">No folders added yet</h3>
                  <p className="text-sm text-black/50 dark:text-white/50 mt-1">
                    Add your first folder to start indexing videos.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="folders-list" className="space-y-4">
                  {folders.map((folder) => {
                    const statusInfo = getStatusInfo(folder.status)
                    const isScanning = folder.status === 'scanning'
                    const folderName = folder.path?.split('/').pop() || folder.path

                    return (
                      <motion.div
                        key={folder.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden hover:border-black/20 dark:hover:border-white/20 transition-colors"
                      >
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <Link to={`/app/folders/${folder.id}`} className="flex-1 min-w-0 group">
                              <div className="flex items-center gap-3 mb-2">
                                <FolderIcon className="size-5 shrink-0 text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                <h3 className="text-base font-medium text-black dark:text-white truncate group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors">
                                  {folderName}
                                </h3>
                              </div>
                              <p className="text-xs text-black/50 dark:text-white/50 truncate font-mono ml-8">
                                {folder.path}
                              </p>
                            </Link>

                            <button
                              onClick={() => handleOpenDeleteModal(folder)}
                              disabled={isScanning}
                              aria-label={`Delete folder ${folderName}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                          <div className={`flex items-center gap-1.5 font-medium ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                          </div>
                          <span className="text-black/40 dark:text-white/40" aria-hidden="true">
                            •
                          </span>
                          <div className="text-black/60 dark:text-white/60">
                            <span className="font-medium text-black dark:text-white">{folder.videoCount || 0}</span>{' '}
                            {folder.videoCount === 1 ? 'video' : 'videos'}
                          </div>
                          {folder.lastScanned && (
                            <>
                              <span className="text-black/40 dark:text-white/40" aria-hidden="true">
                                •
                              </span>
                              <div className="text-black/60 dark:text-white/60">
                                Last scan:{' '}
                                <span className="font-medium text-black dark:text-white">
                                  {smartFormatDate(folder.lastScanned)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.section className="my-12">
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                <ArrowTopRightOnSquareIcon className="size-5 text-black/70 dark:text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Immich Import</h2>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  Import videos directly from your Immich library.
                </p>
              </div>
            </div>
            <Link
              to="/app/immich-import"
              className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <CircleStackIcon className="size-4" />
              Go to Immich Import
            </Link>
          </motion.div>
        </motion.section>

        <motion.p className="text-sm text-black/50 dark:text-white/50 text-center mt-10">
          Videos are indexed automatically when folders are added or modified.
        </motion.p>
      </motion.main>

      <AddFolder isOpen={isAddModalOpen} onClose={closeAddModal} onAdd={handleAddFolder} />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteFolder}
        title="Delete folder"
        description="Removing this folder will stop indexing new videos. Existing videos in your system will remain intact."
        resourceName={currentFolder?.path || 'Untitled folder'}
        confirmText="Delete folder"
      />
    </DashboardLayout>
  )
}
