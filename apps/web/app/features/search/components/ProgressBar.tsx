import type { SceneAndMatch } from '@shared/types/video'
import { useMemo, useState, useCallback } from 'react'

interface ProgressBarProps {
  scenes: SceneAndMatch[]
  duration: number
}

interface BucketData {
  matched: boolean
  thumbnailUrl?: string
}

function bucketScenes(scenes: SceneAndMatch[], duration: number, buckets = 200): BucketData[] {
  const result: BucketData[] = Array.from({ length: buckets }, () => ({
    matched: false,
    thumbnailUrl: undefined,
  }))

  for (const scene of scenes) {
    const start = Math.floor((scene.startTime / duration) * buckets)
    const end = Math.ceil((scene.endTime / duration) * buckets)

    if (scene.matched) {
      for (let i = start; i < end; i++) {
        if (i >= 0 && i < buckets) {
          result[i] = {
            matched: true,
            thumbnailUrl: scene.thumbnailUrl,
          }
        }
      }
    }
  }

  return result
}

export function ProgressBar({ scenes, duration }: ProgressBarProps) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null)
  const [mouseX, setMouseX] = useState(0)

  const buckets = useMemo(() => bucketScenes(scenes, duration, 200), [scenes, duration])

  const hoveredThumbnail = useMemo(() => {
    if (hoveredBucket === null) return null
    return buckets[hoveredBucket]?.thumbnailUrl
  }, [hoveredBucket, buckets])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const bucketIndex = Math.floor((x / rect.width) * buckets.length)

      setMouseX(x)

      if (bucketIndex >= 0 && bucketIndex < buckets.length && buckets[bucketIndex].matched) {
        setHoveredBucket(bucketIndex)
      } else {
        setHoveredBucket(null)
      }
    },
    [buckets]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredBucket(null)
  }, [])

  return (
    <div className="relative bottom-0 flex h-full w-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {buckets.map((bucket, i) => (
        <div key={i} className="relative flex-1 w-full h-full">
          {bucket.matched ? (
            <div className="absolute bg-green-500 h-1 bottom-0 right-0 left-0" />
          ) : (
            <div className="absolute bg-white/50 h-1 bottom-0 right-0 left-0" />
          )}
        </div>
      ))}

      {hoveredThumbnail && (
        <div
          className="absolute z-300 pointer-events-none"
          style={{
            left: `${mouseX}px`,
            bottom: '20px',
            marginBottom: '8px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/20 bg-black">
            <img
              src={`/thumbnails/${encodeURIComponent(hoveredThumbnail)}`}
              alt="Scene preview"
              className="w-full h-27 object-cover"
              loading="eager"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2"></div>
          </div>
        </div>
      )}
    </div>
  )
}
