import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction } from 'react-router'

import { useImmichIntegration } from '~/features/immich/hooks/useImmichIntegration'
import { useImmichImportStatus } from '~/features/immich/hooks/useImmichImportStatus'
import { IntegrationCard } from '~/features/immich/components/IntegrationCard'
import { Documentation } from '~/features/immich/components/Documentation'
import { ImportProgress } from '~/features/immich/components/ImportProgress'
import { useModal } from '~/features/shared/hooks/useModal'
import { DeleteModal } from '@ui/components/DeleteModal'

export const meta: MetaFunction = () => [{ title: 'Immich Integration | Edit Mind' }]

export default function ImmichIntegrationPage() {
  const {  setShowApiKeyForm, deleteIntegration } = useImmichIntegration()
  const { importStatus, isImporting } = useImmichImportStatus()

  const onDeleteIntegration = async () => {
    await deleteIntegration()
    setShowApiKeyForm(true)
  }
  const { openModal, isOpen, closeModal } = useModal()

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Immich Integration</h1>
          <p className="text-white/60">
            Import face labels from Immich to help with labelling your faces in the videos
          </p>
        </header>

        <IntegrationCard onDeleteIntegration={openModal} />

        {isImporting && <ImportProgress importStatus={importStatus} />}

        <DeleteModal
          isOpen={isOpen}
          onClose={closeModal}
          title="Delete Immich Integration"
          description="Removing this Immich integration will be delete only the API configuration. This action cannot be undone."
          resourceName={''}
          confirmText="Delete"
          onConfirm={onDeleteIntegration}
        />

        <Documentation />
      </main>
    </DashboardLayout>
  )
}
