import { FolderIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { Folder } from '@prisma/client'
import { useMemo } from 'react'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useModal } from '~/features/shared/hooks/useModal'
import { FolderCard } from '~/features/folders/components/FolderCard'
import { Button } from '@ui/components/Button'
import { FolderCreateSchema } from '~/features/folders/schemas/folder'
import { AddFolder } from '~/features/folders/components/AddFolder'
import { DeleteModal } from '@ui/components/DeleteModal'
import { StatCard } from './StatsCard'
import { useTranslation } from 'react-i18next'

export const FolderSettings = () => {
    const { folders, createFolder, totalVideos, totalDuration, error } = useFolders()
    const { t } = useTranslation()
    const { deleteFolder, setCurrentFolder, currentFolder } = useCurrentFolder()

    const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal()
    const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal()

    const stats = useMemo(
        () => [
            {
                id: 'folders',
                icon: <FolderIcon className="size-5 text-black/60 dark:text-white/60" />,
                label: t('folders.stats.totalFolders'),
                value: folders.length.toString(),
            },
            {
                id: 'videos',
                icon: <CheckCircleIcon className="size-5 text-black/60 dark:text-white/60" />,
                label: t('folders.stats.videosScanned'),
                value: totalVideos.toString(),
            },
            {
                id: 'duration',
                icon: <ArrowUpTrayIcon className="size-5 text-black/60 dark:text-white/60" />,
                label: t('folders.stats.totalProcessedDuration'),
                value: humanizeSeconds(totalDuration),
            },
        ],
        [folders.length, t, totalVideos, totalDuration]
    )

    const handleOpenDeleteModal = (folder: Folder) => {
        setCurrentFolder({ ...folder, jobs: [] })
        openDeleteModal()
    }

    const handleAddFolder = async (path: string): Promise<boolean> => {
        try {
            const { success, data } = FolderCreateSchema.safeParse({ path })
            if (!success) {
                throw new Error(t('folders.errors.invalidFormData'))
            }
            const folder = await createFolder(data)
            if (folder) {
                closeAddModal()
            }
            return true
        } catch (error) {
            console.error(t('folders.errors.addFailed'), error)
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
            console.error(t('folders.errors.deleteFailed'), error)
        }
    }

    const hasFolders = folders.length > 0
    return (
        <section>
            <section className="mb-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {stats.map((stat) => (
                        <StatCard stat={stat} />
                    ))}
                </div>
            </section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-black dark:text-white">{t('folders.settings.title')}</h2>
                    <p className="text-sm text-black/50 dark:text-white/50">
                        {t('folders.settings.description')}
                    </p>
                </div>
                <Button onClick={openAddModal} leftIcon={<PlusIcon className="size-4" />}>
                    {t('folders.settings.addFolder')}
                </Button>
            </div>

            <div className="space-y-4">
                {!hasFolders ? (
                    <div className="text-center py-20 px-6 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl">
                        <FolderIcon className="size-12 mx-auto text-black/20 dark:text-white/20 mb-4" />
                        <h3 className="text-lg font-medium text-black dark:text-white">{t('folders.settings.emptyTitle')}</h3>
                        <p className="text-sm text-black/50 dark:text-white/50 mt-1">
                            {t('folders.settings.emptyDescription')}
                        </p>
                    </div>
                ) : (
                    <div key="folders-list" className="space-y-4">
                        {folders.map((folder) => (
                            <FolderCard folder={folder} onDelete={handleOpenDeleteModal} />
                        ))}
                    </div>
                )}
            </div>
            <AddFolder isOpen={isAddModalOpen} onClose={closeAddModal} onAdd={handleAddFolder} error={error} />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDeleteFolder}
                title={t('folders.settings.deleteTitle')}
                description={t('folders.settings.deleteDescription')}
                resourceName={currentFolder?.path || t('folders.settings.untitledFolder')}
                confirmText={t('folders.settings.deleteTitle')}
            />

            <p className="text-sm text-black/50 dark:text-white/50 text-center mt-10">
                {t('folders.settings.footer')}
            </p>
        </section>
    )
}

export default FolderSettings
