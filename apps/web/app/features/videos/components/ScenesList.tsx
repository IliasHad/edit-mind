import type { Scene } from '@shared/schemas'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatTime } from '~/features/customVideoPlayer/utils/formatting'

export default function ScenesList({
  scenes,
  activeScene,
  onSceneClick,
}: {
  scenes: Scene[]
  activeScene?: Scene
  onSceneClick: (scene: Scene) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: scenes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  useEffect(() => {
    if (!activeScene) return

    const activeIndex = scenes.findIndex(
      (scene) => scene.startTime === activeScene.startTime && scene.endTime === activeScene.endTime
    )

    if (activeIndex !== -1) {
      rowVirtualizer.scrollToIndex(activeIndex, {
        align: 'center',
        behavior: 'smooth',
      })
    }
  }, [activeScene, scenes, rowVirtualizer])

  return (
    <div
      ref={parentRef}
      className="max-h-[calc(100vh-100px)] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const scene = scenes[virtualRow.index]
          const isActive = scene.endTime === activeScene?.endTime && scene.startTime === activeScene.startTime

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: virtualRow.index * 0.01,
                duration: 0.15,
              }}
              onClick={() => onSceneClick(scene)}
              className="group cursor-pointer"
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                width: '100%',
                height: '110px',
                paddingBottom: '8px',
              }}
            >
              <div
                className={`
                  relative h-full rounded-xl overflow-hidden
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10'
                      : 'bg-transparent hover:bg-black/2 dark:hover:bg-white/2'
                  }
                `}
              >
                <div className="flex gap-3 p-3 h-full">
                  <div className="relative shrink-0">
                    <img
                      src={'/thumbnails/' + scene.thumbnailUrl}
                      alt={`Scene ${virtualRow.index + 1}`}
                      className="w-32 h-full object-cover rounded-lg"
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={`
                          inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                          backdrop-blur-sm
                          ${
                            isActive
                              ? 'bg-black/90 dark:bg-white/90 text-white dark:text-black'
                              : 'bg-white/90 dark:bg-black/90 text-black dark:text-white'
                          }
                        `}
                      >
                        {virtualRow.index + 1}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <p
                      className={`
                        text-xs leading-relaxed line-clamp-3
                        transition-colors duration-150
                        ${
                          isActive
                            ? 'text-black dark:text-white font-medium'
                            : 'text-black/60 dark:text-white/60'
                        }
                      `}
                    >
                      {scene.text}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-black/40 dark:text-white/40 font-mono tabular-nums mt-2">
                      <span>{formatTime(scene.startTime)}</span>
                      <span>→</span>
                      <span>{formatTime(scene.endTime)}</span>
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-black dark:bg-white rounded-r-full" />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}