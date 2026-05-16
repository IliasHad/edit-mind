import { ArrowPathIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { Button } from '@ui/components/Button'
import type { ImmichIntegration } from '@immich/types/immich'

interface ActiveIntegrationProps {
  integration: ImmichIntegration | null
  refreshImport: () => void
  setShowApiKeyForm: (value: boolean) => void
  onDeleteIntegration: () => void
}

export function ActiveIntegration({
  integration,
  refreshImport,
  setShowApiKeyForm,
  onDeleteIntegration,
}: ActiveIntegrationProps) {
  const { t } = useTranslation()

  return (
    <div className="p-8">
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-white mb-2">{t('immich.active.title')}</h2>
        <p className="text-base text-white/60 mb-2">{t('immich.active.description')}</p>
        {integration?.baseUrl && (
          <p className="text-base text-white/50 mb-8">
            {t('immich.active.connectedTo')} <span className="font-mono text-white/70">{integration.baseUrl}</span>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={refreshImport} variant="primary" leftIcon={<ArrowPathIcon />}>
            {t('immich.active.refresh')}
          </Button>

          <Button onClick={() => setShowApiKeyForm(true)} variant="ghost" leftIcon={<KeyIcon />}>
            {t('immich.active.updateSettings')}
          </Button>

          <Button onClick={onDeleteIntegration} variant="destructive" leftIcon={<TrashIcon />}>
            {t('immich.active.deleteIntegration')}
          </Button>
        </div>
      </div>
    </div>
  )
}
