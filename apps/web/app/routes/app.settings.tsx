import {
  FolderIcon,
  PlusIcon,
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
import { humanizeSeconds } from '~/features/shared/utils/duration';
import { DeleteModal } from '@ui/components/DeleteModal'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useModal } from '~/features/shared/hooks/useModal'
import { FolderCard } from '~/features/folders/components/FolderCard'
import { StatCard } from '~/features/settings/components/StatsCard'
import { FeatureCard } from '~/features/settings/components/FeatureCard'
import { Button } from '@ui/components/Button'

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

export default function SettingsPage() {
  const { folders, createFolder, totalVideos, totalDuration, error, loading } = useFolders()
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
      const folder = await createFolder({ path })
      if (folder) {
        closeAddModal()
      }
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
            {stats.map((stat, index) => (
              <StatCard stat={stat} index={index} />
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
            <Button onClick={openAddModal} leftIcon={<PlusIcon className="size-4" />}>
              Add Folder
            </Button>
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
                  {folders.map((folder) => (
                    <FolderCard folder={folder} onDelete={handleOpenDeleteModal} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
        
        <div className="my-4">
          <FeatureCard
            icon={<ArrowTopRightOnSquareIcon className="size-5 text-white/70" />}
            title="Immich Import"
            description="Import videos directly from your Immich library."
            primaryCta={{
              text: 'Go to Immich Import',
              icon: <CircleStackIcon className="size-4" />,
              link: '/app/immich-import',
            }}
          />
        </div>

        <motion.p className="text-sm text-black/50 dark:text-white/50 text-center mt-10">
          Videos are indexed automatically when folders are added or modified.
        </motion.p>
      </motion.main>

      <AddFolder
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onAdd={handleAddFolder}
        error={error}
        loading={loading}
      />

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
