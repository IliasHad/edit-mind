import { logger } from '@shared/services/logger'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import type { Scene } from '@shared/types/scene'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/solid';

export const SceneCard = ({
  scene,
  isSelected,
  onSelect,
  onOpen,
}: {
  scene: Scene
  isSelected: boolean
  onSelect: () => void
  onOpen: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const playSegment = () => {
      video.currentTime = scene.startTime
      video.play().catch((e) => logger.warn('Autoplay prevented', e))
    }

    const handleTimeUpdate = () => {
      if (video.currentTime >= scene.endTime) {
        playSegment()
      }
    }

    if (isHovering) {
      playSegment()
      video.addEventListener('timeupdate', handleTimeUpdate)
    } else {
      video.pause()
      video.currentTime = scene.startTime
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }

    return () => {
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }
  }, [isHovering, scene])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      <AnimatePresence>
        {isHovering ? (
          <motion.video
            ref={videoRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            src={`/media/${scene.source}`}
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            src={`/thumbnails/${scene.thumbnailUrl}`}
            alt={scene.description}
            className="h-full w-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p className="text-xs font-medium">{humanizeSeconds(scene.endTime - scene.startTime)}</p>
      </div>
      <div
        className="absolute right-3 top-3 z-10"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
            isSelected ? 'border-white bg-white' : 'border-white/50 bg-black/20 backdrop-blur'
          }`}
        >
          {isSelected && <CheckIcon className="h-4 w-4 text-black" strokeWidth={3} />}
        </div>
      </div>
    </motion.div>
  )
}