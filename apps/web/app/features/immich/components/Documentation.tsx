import { useTranslation } from 'react-i18next'
import { Disclosure } from '@ui/components/Disclosure'

const permissionRows = [
  { scope: 'person.read', descriptionKey: 'personRead' },
  { scope: 'face.read', descriptionKey: 'faceRead' },
  { scope: 'asset.read', descriptionKey: 'assetRead' },
  { scope: 'asset.download', descriptionKey: 'assetDownload' },
  { scope: 'asset.share', descriptionKey: 'assetShare' },
  { scope: 'timeline.read', descriptionKey: 'timelineRead' },
] as const

export function Documentation() {
  const { t } = useTranslation()
  const apiKeySteps = t('immich.documentation.apiKeySteps', { returnObjects: true }) as string[]
  const importSteps = t('immich.documentation.importSteps', { returnObjects: true }) as string[]

  return (
    <div className="mt-8 space-y-4">
      <Disclosure title={t('immich.documentation.apiKeyTitle')} defaultOpen={false}>
        <ol className="text-sm text-white/70 space-y-2">
          {apiKeySteps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="font-semibold text-white/90 min-w-6">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Disclosure>

      <Disclosure title={t('immich.documentation.permissionsTitle')} defaultOpen={false}>
        <p className="text-sm text-white/70 mb-4">{t('immich.documentation.permissionsDescription')}</p>
        <ul className="space-y-3">
          {permissionRows.map(({ scope, descriptionKey }) => (
            <li key={scope} className="flex items-start gap-3">
              <code className="bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs font-mono text-blue-300 shrink-0">
                {scope}
              </code>
              <span className="text-sm text-white/70 pt-0.5">{t(`immich.documentation.permissions.${descriptionKey}`)}</span>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title={t('immich.documentation.importTitle')} defaultOpen={false}>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-200">
              <strong className="font-semibold">{t('immich.documentation.important')}</strong> {t('immich.documentation.importantDescription')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">{t('immich.documentation.duringImportTitle')}</h4>
            <ol className="space-y-2">
              {importSteps.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="font-semibold text-white/90 min-w-6">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Disclosure>
    </div>
  )
}
