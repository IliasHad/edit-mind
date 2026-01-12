import { Link } from 'react-router-dom'
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  CircleStackIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useLoaderData, type MetaFunction } from 'react-router'
import type { Folder, FolderStatus as PrismaFolderStatus } from '@prisma/client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AddFolder } from '~/features/folders/components/AddFolder'
import { humanizeSeconds, smartFormatDate } from '~/features/shared/utils/duration'
import { logger } from '@shared/services/logger'
import { FolderModel } from '@db/index'
import { DeleteModal } from '~/features/shared/components/DeleteModal'
import { useDeleteModal } from '~/features/shared/hooks/useDeleteModal'

export async function loader() {
  try {
    const folders = await FolderModel.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        videos: {
          select: {
            duration: true,
          },
        },
      },
    })
    const totalDuration = folders
      .flatMap((folder) => folder.videos)
      .reduce((a, b) => a + parseFloat(b.duration.toString()), 0)
    const totalVideos = folders.reduce((acc, f) => acc + (f?.videoCount || 0), 0)

    return {
      folders,
      totalDuration,
      totalVideos,
    }
  } catch (error) {
    logger.error(error)
    return { folders: [] }
  }
}

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>()
  const [folders, setFolders] = useState(data?.folders || [])
  const [showAddModal, setShowAddModal] = useState(false)
  const { isOpen, openModal, closeModal } = useDeleteModal()
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)

  const handleOpenAddModal = () => {
    setShowAddModal(true)
  }

  const handleOpenDeleteModal = (folder: Folder) => {
    setSelectedFolder(folder)
    openModal()
  }

  const handleAddFolder = async (path: string) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })

      if (!response.ok) throw new Error('Failed to add folder')

      const data = await response.json()
      const { folder } = data

      setFolders((prev) => [
        {
          ...folder,
          size: 0,
          lastScanned: null,
          watcherEnabled: true,
          excludePatterns: [],
          includePatterns: ['*.mp4', '*.mov', '*.avi', '*.mkv'],
        },
        ...prev,
      ])

      return true
    } catch (error) {
      console.error('Failed to add folder:', error)
      return false
    }
  }

  const handleDeleteFolder = async () => {
    try {
      const response = await fetch(`/api/folders/${selectedFolder?.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete folder')

      setFolders((prev) => prev.filter((f) => f.id !== selectedFolder?.id))
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const getStatusInfo = (status: PrismaFolderStatus) => {
    switch (status) {
      case 'scanning':
        return {
          icon: <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />,
          text: 'Scanning...',
          color: 'text-blue-600 dark:text-blue-400',
        }
      case 'indexed':
        return {
          icon: <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />,
          text: 'Indexed',
          color: 'text-green-600 dark:text-green-400',
        }
      case 'error':
        return {
          icon: <ExclamationCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />,
          text: 'Error',
          color: 'text-red-600 dark:text-red-400',
        }
      default:
        return {
          icon: null,
          text: 'Idle',
          color: 'text-black/50 dark:text-white/50',
        }
    }
  }

  const stats = [
    {
      icon: <FolderIcon className="size-5 text-black/60 dark:text-white/60" />,
      label: 'Total Folders',
      value: folders.length,
    },
    {
      icon: <CheckCircleIcon className="size-5 text-black/60 dark:text-white/60" />,
      label: 'Videos Scanned',
      value: data.totalVideos,
    },
    {
      icon: <ArrowUpTrayIcon className="size-5 text-black/60 dark:text-white/60" />,
      label: 'Total Processed Duration',
      value: humanizeSeconds(data.totalDuration),
    },
  ]

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold text-black dark:text-white">Settings</h1>
          <p className="text-base text-black/50 dark:text-white/50 mt-1">Manage video folders to scan and index.</p>
        </header>

        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-6 flex items-start gap-5"
              >
                <div className="p-3 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                  {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-black/60 dark:text-white/60">{stat.label}</p>
                  <p className="text-2xl font-semibold text-black dark:text-white mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">Video Folders</h2>
              <p className="text-sm text-black/50 dark:text-white/50">
                Add folders to automatically scan and index videos.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <PlusIcon className="size-4" />
              Add Folder
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {folders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 px-6 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl"
                >
                  <FolderIcon className="size-12 mx-auto text-black/20 dark:text-white/20 mb-4" />
                  <h3 className="text-lg font-medium text-black dark:text-white">No folders added yet</h3>
                  <p className="text-sm text-black/50 dark:text-white/50 mt-1">
                    Add your first folder to start indexing videos.
                  </p>
                </motion.div>
              ) : (
                folders.map((folder) => {
                  const statusInfo = getStatusInfo(folder.status)
                  const isScanning = folder.status === 'scanning'
                  return (
                    <motion.div
                      key={folder.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <Link to={`/app/folders/${folder.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <FolderIcon className="size-5 shrink-0 text-black/70 dark:text-white/70" />
                              <h3 className="text-base font-medium text-black dark:text-white truncate">
                                {folder.path.split('/').pop() || folder.path}
                              </h3>
                            </div>
                            <p className="text-xs text-black/50 dark:text-white/50 truncate font-mono ml-8">
                              {folder.path}
                            </p>
                          </Link>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                              onClick={() => handleOpenDeleteModal(folder)}
                              disabled={isScanning}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <div className={`flex items-center gap-1.5 font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span>{statusInfo.text}</span>
                        </div>
                        <span className="text-black/40 dark:text-white/40">•</span>
                        <div className="text-black/60 dark:text-white/60">
                          <span className="font-medium text-black dark:text-white">{folder.videoCount || 0}</span>{' '}
                          videos
                        </div>
                        {folder.lastScanned && (
                          <>
                            <span className="text-black/40 dark:text-white/40">•</span>
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
                })
              )}
            </AnimatePresence>
          </div>
        </section>
        <section className="my-12">
          <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
                  <ArrowTopRightOnSquareIcon className="size-5 text-black/70 dark:text-white/70" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-black dark:text-white">Immich Import</h2>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    Import videos directly from your Immich library.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/app/immich-import"
              className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <CircleStackIcon className="size-4" />
              Go to Immich Import
            </Link>
          </div>
        </section>
        <p className="text-sm text-black/50 dark:text-white/50 text-center mt-10">
          Videos are indexed automatically when folders are added or modified.
        </p>
      </main>

      <AddFolder isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddFolder} />

      <DeleteModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleDeleteFolder}
        title="Delete folder"
        description="Removing this folder will stop indexing new videos. Existing videos in your system will remain intact."
        resourceName={selectedFolder?.path || 'Untitled folder'}
        confirmText="Delete folder"
      />
    </DashboardLayout>
  )
}
