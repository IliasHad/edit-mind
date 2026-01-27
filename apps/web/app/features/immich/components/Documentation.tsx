import { Disclosure } from '@ui/components/Disclosure'

export function Documentation() {
  return (
    <div className="mt-8 space-y-4">
      <Disclosure title="How to Get Your API Key?" defaultOpen={false}>
        <ol className="text-sm text-white/70 space-y-2">
          {[
            'Open your Immich instance',
            'Go to Account Settings',
            'Navigate to API Keys section',
            'Create a new API key with the required scopes (see below)',
            'Copy and paste the key above',
          ].map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="font-semibold text-white/90 min-w-6">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Disclosure>

      <Disclosure title="What are the required API Permissions?" defaultOpen={false}>
        <p className="text-sm text-white/70 mb-4">Your API key must have these permissions to enable face labeling:</p>
        <ul className="space-y-3">
          {[
            { scope: 'person.read', description: 'Access people and face data' },
            { scope: 'face.read', description: 'Read face metadata for labeling' },
            { scope: 'asset.read', description: 'Read asset information (photos)' },
            { scope: 'asset.download', description: 'Download assets for processing' },
            { scope: 'asset.share', description: 'Reference assets in workflows' },
            { scope: 'timeline.read', description: 'Associate faces with timeline events' },
          ].map(({ scope, description }) => (
            <li key={scope} className="flex items-start gap-3">
              <code className="bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs font-mono text-blue-300 shrink-0">
                {scope}
              </code>
              <span className="text-sm text-white/70 pt-0.5">{description}</span>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title="How Face Import Works" defaultOpen={false}>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-200">
              <strong className="font-semibold">Important:</strong> This integration fetches face detection data from
              Immich's API.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">What happens during import:</h4>
            <ol className="space-y-2">
              {[
                'Connects to your Immich instance using the provided API key',
                'Retrieves face detection metadata including bounding box coordinates',
                'Downloads face regions from your assets for local display',
                'Associates detected faces with people in your Immich library',
                'Use face labels to video face recognition',
              ].map((item, index) => (
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
