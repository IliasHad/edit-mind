import { useImmichIntegration } from '~/features/immich/hooks/useImmichIntegration'
import { useImmichImportStatus } from '~/features/immich/hooks/useImmichImportStatus'
import { IntegrationCard } from '~/features/immich/components/IntegrationCard'
import { ImportProgress } from '~/features/immich/components/ImportProgress'
import { Documentation } from '~/features/immich/components/Documentation'
import { DeleteModal } from '@ui/components/DeleteModal'
import { useModal } from '~/features/shared/hooks/useModal'

export function AdvancedSettings() {
  const { deleteIntegration, setShowApiKeyForm } = useImmichIntegration()
  const { importStatus, isImporting } = useImmichImportStatus()
  const { isOpen, openModal, closeModal } = useModal()

  const handleDelete = async () => {
    await deleteIntegration()
    setShowApiKeyForm(true)
    closeModal()
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Immich Integration</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Import face labels from your Immich library to label faces in videos.
        </p>
      </div>

      <IntegrationCard onDeleteIntegration={openModal} />

      {isImporting && <ImportProgress importStatus={importStatus} />}

      <Documentation />

      <DeleteModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Delete Immich Integration"
        description="Removing this Immich integration will delete only the API configuration. This action cannot be undone."
        resourceName=""
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </section>
  )
}
