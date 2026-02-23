import { FolderCreateSchema } from '~/features/folders/schemas/folder'
import { useModal } from '~/features/shared/hooks/useModal'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { PlusIcon } from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'
import { AddFolder } from '~/features/folders/components/AddFolder'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { useSetup } from '../hooks/useSetup'




export function FolderPanel() {
    const { isOpen: isAddModalOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal()
    const { createFolder, error } = useFolders()
    const { setCurrentFolder, currentFolder } = useCurrentFolder()
    const { handleNext } = useSetup()

    const handleAddFolder = async (path: string): Promise<boolean> => {
        try {
            const { success, data } = FolderCreateSchema.safeParse({ path })
            if (!success) {
                throw new Error('Invalid folder form data')
            }
            const folder = await createFolder(data)
            if (folder) {
                setCurrentFolder(folder)
                closeAddModal()
                handleNext()
            }
            return true
        } catch (error) {
            console.error('Failed to add folder:', error)
            return false
        }
    }
    return (
        <div className="w-full h-full p-8 flex flex-col justify-center gap-5">


            {currentFolder?.path}
            <Button onClick={openAddModal} leftIcon={<PlusIcon className="size-4" />}>
                Select your first folder
            </Button>
            <AddFolder isOpen={isAddModalOpen} onClose={closeAddModal} onAdd={handleAddFolder} error={error} />
        </div>
    )
}
