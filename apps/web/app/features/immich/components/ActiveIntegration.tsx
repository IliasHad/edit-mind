import { ArrowPathIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline'
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
  return (
    <div className="p-8">
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-white mb-2">Integration Active</h2>
        <p className="text-base text-white/60 mb-2">Face labels are imported automatically from Immich</p>
        {integration?.baseUrl && (
          <p className="text-base text-white/50 mb-8">
            Connected to: <span className="font-mono text-white/70">{integration.baseUrl}</span>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={refreshImport} variant="primary" leftIcon={<ArrowPathIcon />}>
            Refresh Face Labels
          </Button>

          <Button onClick={() => setShowApiKeyForm(true)} variant="ghost" leftIcon={<KeyIcon />}>
            Update Settings
          </Button>

          <Button onClick={onDeleteIntegration} variant="destructive" leftIcon={<TrashIcon />}>
            Delete Integration
          </Button>
        </div>
      </div>
    </div>
  )
}
