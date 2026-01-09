import type { SceneAndMatch } from '@shared/types/video'
import { useMemo } from 'react'

interface ProgressBarProps {
  scenes: SceneAndMatch[]
  duration: number
}

function bucketScenes(scenes: SceneAndMatch[], duration: number, buckets = 200) {
  const result = Array.from({ length: buckets }, () => false)

  for (const scene of scenes) {
    const start = Math.floor((scene.startTime / duration) * buckets)
    const end = Math.ceil((scene.endTime / duration) * buckets)

    if (scene.matched) {
      for (let i = start; i < end; i++) {
        result[i] = true
      }
    }
  }

  return result
}

export function ProgressBar({ scenes, duration }: ProgressBarProps) {
  const buckets = useMemo(() => bucketScenes(scenes, duration, 200), [scenes, duration])

  return (
    <div className="flex h-4 w-full rounded-full overflow-hidden">
      {buckets.map((matched, i) => (
        <div key={i} className="relative flex-1">
          <div
            className={`absolute left-0 right-0 ${
              matched ? 'top-0 bottom-0 w-2 z-10 bg-green-600' : 'top-0 bottom-0  bg-white/50'
            }`}
          />
        </div>
      ))}
    </div>
  )
}
