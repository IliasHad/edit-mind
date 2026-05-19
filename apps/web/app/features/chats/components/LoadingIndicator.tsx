import type { MessageStage } from '@prisma/client'
import { useTranslation } from 'react-i18next'
import type { Scene } from '@shared/types'

interface LoadingIndicatorProps {
  stage?: MessageStage | null
  selectedScenes?: Scene[]
}

export function LoadingIndicator({ stage, selectedScenes }: LoadingIndicatorProps) {
  const { t } = useTranslation()

  const getStageText = (stage?: MessageStage | null) => {
    const count = selectedScenes?.length ?? 0

    switch (stage) {
      case 'understanding':
        return t('chats.loading.understanding')
      case 'searching':
        return t('chats.loading.searching')
      case 'analyzing':
        return t('chats.loading.analyzing')
      case 'compiling':
        return t(count === 1 ? 'chats.loading.compilingOne' : 'chats.loading.compilingOther', { count })
      case 'exporting_scenes':
        return t(count === 1 ? 'chats.loading.exportingOne' : 'chats.loading.exportingOther', { count })
      case 'refining':
        return t('chats.loading.refining')
      case 'stitching':
        return t(count === 1 ? 'chats.loading.stitchingOne' : 'chats.loading.stitchingOther', { count })
      default:
        return t('chats.loading.processing')
    }
  }

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-black/40 dark:bg-white/40 animate-pulse"
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '1.4s',
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-0.5">
          <span className="text-md font-medium text-black/70 dark:text-white/70 animate-pulse">
            {getStageText(stage)}
          </span>
        </div>
      </div>
    </div>
  )
}
