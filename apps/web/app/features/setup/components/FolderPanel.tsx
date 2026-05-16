import { FolderCreateSchema } from '~/features/folders/schemas/folder'
import { useModal } from '~/features/shared/hooks/useModal'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { PlusIcon } from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'
import { AddFolder } from '~/features/folders/components/AddFolder'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useSetup } from '../hooks/useSetup'
import { useTranslation } from 'react-i18next'




export function FolderPanel() {
    const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal()
    const { createFolder, error } = useFolders()
    const { setCurrentFolder, currentFolder } = useCurrentFolder()
    const { handleNext } = useSetup()
    const { t } = useTranslation()

    const handleAddFolder = async (path: string): Promise<boolean> => {
        try {
            const { success, data } = FolderCreateSchema.safeParse({ path })
            if (!success) {
                throw new Error(t('setup.folder.invalidFormData'))
            }
            const folder = await createFolder(data)
            if (folder) {
                setCurrentFolder(folder)
                closeAddModal()
                handleNext()
            }
            return true
        } catch (error) {
            console.error(t('setup.folder.addFailed'), error)
            return false
        }
    }
    return (
        <div className="w-full h-full p-8 flex flex-col justify-center gap-5">


            {currentFolder?.path}
            <Button onClick={openAddModal} leftIcon={<PlusIcon className="size-4" />}>
                {t('setup.folder.selectFirst')}
            </Button>
            <AddFolder isOpen={isAddModalOpen} onClose={closeAddModal} onAdd={handleAddFolder} error={error} />
        </div>
    )
}
