import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion';
import { ScenePreview } from './ScenePreview'
import { formatTime } from '../utils/formatting'
import type { Scene } from '@shared/types/scene'
import type { Bucket } from '../types';


interface ProgressBarProps {
  scenes: Scene[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

const MAX_SEGMENTS = 40

export function ProgressBar({ scenes, duration, currentTime, onSeek }: ProgressBarProps) {
  const [hoverScene, setHoverScene] = useState<Scene | null>(null)
  const [hoverX, setHoverX] = useState(0)

  // Group scenes into buckets for performance
  const buckets = useMemo(() => {
    if (scenes.length <= MAX_SEGMENTS) {
      return scenes.map((s) => ({
        start: s.startTime,
        end: s.endTime,
        scenes: [s],
        thumbnail: s.thumbnailUrl,
      }))
    }

    const bucketSize = duration / MAX_SEGMENTS
    const result = []

    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const start = i * bucketSize
      const end = start + bucketSize

      const bucketScenes = scenes.filter((s) => s.startTime < end && s.endTime > start)

      result.push({
        start,
        end,
        scenes: bucketScenes,
        thumbnail: bucketScenes[0]?.thumbnailUrl,
      })
    }

    return result
  }, [scenes, duration])

  // Seek inside bucket precisely
  const handleBucketClick = (e: React.MouseEvent<HTMLDivElement>, bucket: Bucket) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = x / rect.width
    const targetTime = bucket.start + fraction * (bucket.end - bucket.start)
    onSeek(targetTime)
  }

  // Hover → pick correct scene inside the bucket
  const handleBucketHover = (e: React.MouseEvent<HTMLDivElement>, bucket: Bucket) => {
    const bar = e.currentTarget.closest('.progress-container') as HTMLElement
    if (!bar) return

    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverX(x)

    const bucketTime = bucket.start + (x / rect.width) * (bucket.end - bucket.start)

    const bestScene =
      bucket.scenes.find((s: Scene) => bucketTime >= s.startTime && bucketTime <= s.endTime) || bucket.scenes[0]

    setHoverScene(bestScene || null)
  }

  return (
    <div className="relative w-full">
      <div className="relative flex w-full h-2 gap-0.5 cursor-pointer progress-container rounded-full overflow-hidden">
        {buckets.map((bucket, i) => {
          const width = ((bucket.end - bucket.start) / duration) * 100

          const bucketProgress =
            currentTime >= bucket.end
              ? 100
              : currentTime >= bucket.start
                ? ((currentTime - bucket.start) / (bucket.end - bucket.start)) * 100
                : 0

          return (
            <div
              key={i}
              onClick={(e) => handleBucketClick(e, bucket)}
              onMouseMove={(e) => handleBucketHover(e, bucket)}
              onMouseLeave={() => setHoverScene(null)}
              className="relative flex-1 group/segment"
              style={{ width: `${width}%` }}
            >
              <div className="absolute inset-0 bg-white/20 group-hover/segment:bg-white/30 transition-colors rounded-sm" />
              <div
                className="absolute left-0 top-0 h-full bg-white transition-all duration-100 rounded-sm"
                style={{ width: `${bucketProgress}%` }}
              />
            </div>
          )
        })}
        <AnimatePresence>
          {hoverScene && <ScenePreview scene={hoverScene} hoverX={hoverX} formatTime={formatTime} />}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-400 font-medium">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
