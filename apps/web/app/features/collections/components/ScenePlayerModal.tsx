import { logger } from '@shared/services/logger'
import type { Scene } from '@shared/types/scene'
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/solid'

export const ScenePlayerModal = ({ scene, onClose }: { scene: Scene; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

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

    playSegment()
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }
  }, [scene])
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          controls={false}
          src={`/media/${scene.source}`}
          className="w-full rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </motion.div>
    </motion.div>
  )
}
