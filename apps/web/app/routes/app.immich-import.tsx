import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction } from 'react-router'
import { useTranslation } from 'react-i18next'
import { translate } from '~/i18n/translate'

import { useImmichIntegration } from '~/features/immich/hooks/useImmichIntegration'
import { useImmichImportStatus } from '~/features/immich/hooks/useImmichImportStatus'
import { IntegrationCard } from '~/features/immich/components/IntegrationCard'
import { Documentation } from '~/features/immich/components/Documentation'
import { ImportProgress } from '~/features/immich/components/ImportProgress'
import { useModal } from '~/features/shared/hooks/useModal'
import { DeleteModal } from '@ui/components/DeleteModal'

export const meta: MetaFunction = () => [{ title: translate('immich.meta.title') }]

export default function ImmichIntegrationPage() {
  const { t } = useTranslation()
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
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">{t('immich.page.title')}</h1>
          <p className="text-white/60">
            {t('immich.page.description')}
          </p>
        </header>

        <IntegrationCard onDeleteIntegration={openModal} />

        {isImporting && <ImportProgress importStatus={importStatus} />}

        <DeleteModal
          isOpen={isOpen}
          onClose={closeModal}
          title={t('immich.page.deleteTitle')}
          description={t('immich.page.deleteDescription')}
          resourceName={''}
          confirmText={t('immich.page.deleteConfirm')}
          cancelText={t('ui.deleteModal.cancelText')}
          deletingText={t('ui.deleteModal.deletingText')}
          closeButtonAriaLabel={t('ui.modal.closeAria')}
          onConfirm={onDeleteIntegration}
        />

        <Documentation />
      </main>
    </DashboardLayout>
  )
}
