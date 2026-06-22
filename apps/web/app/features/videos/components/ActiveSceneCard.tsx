import { formatTime } from '~/features/customVideoPlayer/utils/formatting'
import { type Scene } from '@shared/types/scene'
import { useTranslation } from 'react-i18next'

interface ActiveSceneCardProps {
  scene: Scene
}

export function ActiveSceneCard({ scene }: ActiveSceneCardProps) {
  const { t } = useTranslation()
  const metadata = [
    { label: t('videos.scenes.metadata.dominantColor'), value: scene.dominantColorName },
    { label: t('videos.scenes.metadata.shotType'), value: scene.shotType },
    { label: t('videos.scenes.metadata.camera'), value: scene.camera },
    { label: t('videos.scenes.metadata.location'), value: scene.location },
    { label: t('videos.scenes.metadata.aspectRatio'), value: scene.aspectRatio },
  ]

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
      <div className="p-8">
        <div className="flex items-start gap-6 mb-8">
          <img
            src={'/thumbnails/' + scene.thumbnailUrl}
            alt={t('videos.scenes.thumbnailAlt')}
            className="w-48 h-28 rounded-xl object-cover"
          />

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50 font-mono tabular-nums">
              <span>{formatTime(scene.startTime)}</span>
              <span>→</span>
              <span>{formatTime(scene.endTime)}</span>
            </div>

            <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed">{scene.text}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 pt-8 border-t border-black/5 dark:border-white/5">
          {metadata.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wide">{item.label}</div>
              <div className="text-sm font-medium text-black dark:text-white">{item.value || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
