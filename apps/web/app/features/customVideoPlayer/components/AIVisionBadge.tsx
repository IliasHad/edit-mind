import { motion, AnimatePresence } from 'framer-motion'
import { UserIcon as User, TagIcon as Tag, LanguageIcon as Type } from '@heroicons/react/24/outline'
import type { Scene } from '@shared/types/scene'
import { BADGE_COLORS } from '../constants/styles'

interface AIVisionBadgeProps {
  currentScene: Scene | null
  showOverlays: boolean
  showControls: boolean
}

export function AIVisionBadge({ currentScene, showOverlays, showControls }: AIVisionBadgeProps) {
  if (!showOverlays || !currentScene) return null

  const hasAnyDetections =
    currentScene.facesData?.length || currentScene.objectsData?.length || currentScene.detectedTextData?.length

  if (!hasAnyDetections) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: showControls ? 1 : 0, x: showControls ? 0 : 20 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className="absolute top-6 left-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border-2 border-white/20 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">AI Vision Active</span>
        </div>
        <div className="w-px h-5 bg-white/20" />

        {currentScene.facesData && currentScene.facesData.length > 0 && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${BADGE_COLORS.face.bg}`}>
            <User className={`w-3.5 h-3.5 ${BADGE_COLORS.face.text}`} strokeWidth={2.5} />
            <span className={`text-sm font-bold ${BADGE_COLORS.face.text}`}>{currentScene.facesData.length}</span>
          </div>
        )}

        {currentScene.objectsData && currentScene.objectsData.length > 0 && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${BADGE_COLORS.object.bg}`}>
            <Tag className={`w-3.5 h-3.5 ${BADGE_COLORS.object.text}`} strokeWidth={2.5} />
            <span className={`text-sm font-bold ${BADGE_COLORS.object.text}`}>{currentScene.objectsData.length}</span>
          </div>
        )}

        {currentScene.detectedTextData && currentScene.detectedTextData.length > 0 && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${BADGE_COLORS.text.bg}`}>
            <Type className={`w-3.5 h-3.5 ${BADGE_COLORS.text.text}`} strokeWidth={2.5} />
            <span className={`text-sm font-bold ${BADGE_COLORS.text.text}`}>
              {currentScene.detectedTextData.length}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
