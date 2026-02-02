import { motion } from 'framer-motion'
import type { Scene } from '@shared/types/scene'

interface ScenePreviewProps {
  scene: Scene
  hoverX: number
  formatTime: (time: number) => string
}

export function ScenePreview({ scene, hoverX, formatTime }: ScenePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-6 z-30 flex flex-col items-center"
      style={{
        left: `${hoverX}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="w-[220px] rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl">
        <img
          src={'/thumbnails/' + scene.thumbnailUrl}
          alt={scene.description}
          className="w-full h-[124px] object-cover"
        />
        <div className="bg-black/95 backdrop-blur-md p-3 border-t border-white/10">
          <p className="text-xs text-white font-medium line-clamp-2 mb-2">{scene.description}</p>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{formatTime(scene.startTime)}</span>
            <span className="px-2 py-0.5 rounded bg-white/10">{scene.shotType}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}