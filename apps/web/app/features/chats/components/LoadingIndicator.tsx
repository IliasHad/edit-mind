import type { MessageStage } from '@prisma/client'
import type { Scene } from '@shared/schemas'

interface LoadingIndicatorProps {
  stage?: MessageStage | null
  selectedScenes?: Scene[]
}

export function LoadingIndicator({ stage, selectedScenes }: LoadingIndicatorProps) {
  const getStageText = (stage?: MessageStage | null) => {
    const count = selectedScenes?.length ?? 0

    switch (stage) {
      case 'understanding':
        return 'Understanding your request…'
      case 'searching':
        return 'Searching for relevant video scenes…'
      case 'analyzing':
        return 'Analyzing your video library…'
      case 'compiling':
        return `Compiling ${count} selected video scene${count === 1 ? '' : 's'}…`
      case 'exporting_scenes':
        return `Exporting ${count} selected video scene${count === 1 ? '' : 's'}…`
      case 'refining':
        return 'Refining video scene results…'
      case 'stitching':
        return `Stitching ${count} selected video scene${count === 1 ? '' : 's'}…`
      default:
        return 'processing'
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
