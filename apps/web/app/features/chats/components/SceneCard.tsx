import React, { useState, useRef, useEffect } from 'react'
import type { Scene } from '@shared/schemas'
import { CheckIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import { humanizeFileName } from '~/features/shared/utils/fileName'
import { Button } from '@ui/components/Button'

interface SceneCardProps {
  scene: Scene
  isSelected: boolean
  isFocused?: boolean
  onSelect: () => void
  onPreview: (e: React.MouseEvent) => void
  onFocus?: () => void
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  isSelected,
  isFocused = false,
  onSelect,
  onPreview,
  onFocus,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startTime = scene.startTime || 0
  const endTime = scene.endTime || 0

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoError) return

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / endTime) * 100)
      if (video.currentTime >= endTime) {
        video.pause()
        video.currentTime = 0
        setIsPlaying(false)
        setProgress(0)
      }
    }

    const handleError = () => {
      setVideoError(true)
      setIsPlaying(false)
    }

    if (isHovered && !imageError) {
      hoverTimeoutRef.current = setTimeout(() => {
        video.currentTime = startTime
        video
          .play()
          .then(() => {
            setIsPlaying(true)
            video.addEventListener('timeupdate', handleTimeUpdate)
          })
          .catch(handleError)
      }, 500)
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      video.pause()
      video.currentTime = 0
      setIsPlaying(false)
      setProgress(0)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }

    video.addEventListener('error', handleError)

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
    }
  }, [isHovered, videoError, imageError, endTime, startTime])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative"
    >
      <div
        onMouseEnter={() => {
          setIsHovered(true)
          onFocus?.()
        }}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onSelect}
        className={`
          relative cursor-pointer group overflow-hidden rounded-2xl 
          bg-white/10 dark:bg-white/5 backdrop-blur-sm 
          transition-all duration-300
          ${isSelected ? 'ring-4 ring-white dark:ring-white scale-95' : ''}
          ${isFocused && !isSelected ? 'ring-4 ring-blue-500 dark:ring-blue-400' : ''}
          ${!isSelected && !isFocused ? 'ring-1 ring-white/10 hover:ring-white/30' : ''}
        `}
      >
        {isHovered && !imageError && !videoError && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 rounded-b-2xl overflow-hidden z-30">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
        )}

        {isSelected && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg z-20 animate-in zoom-in-50 duration-200">
            <CheckIcon className="w-5 h-5 text-black" strokeWidth={3} />
          </div>
        )}

        <Button
          onClick={onPreview}
          className="absolute top-3 left-3 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          variant="ghost"
          size="icon-sm"
          leftIcon={<PlayIcon className="w-4 h-4" fill="currentColor" />}
          aria-label="Preview video"
        />

        <div className="relative w-full aspect-video min-h-[200px]">
          <img
            src={scene.thumbnailUrl ? `/thumbnails/${scene.thumbnailUrl}` : undefined}
            alt={`Scene from ${scene.id}`}
            onError={() => setImageError(true)}
            className={`
              object-cover w-full h-full rounded-2xl transition-opacity duration-300
              ${isPlaying ? 'opacity-0' : 'opacity-100'}
            `}
          />

          {!videoError && (
            <video
              ref={videoRef}
              src={scene.source ? `/media?source=${encodeURIComponent(scene.source)}` : undefined}
              preload="metadata"
              playsInline
              onError={() => setVideoError(true)}
              className={`
                absolute inset-0 object-cover w-full h-full rounded-2xl transition-opacity duration-300
                ${isPlaying ? 'opacity-100' : 'opacity-0'}
              `}
            />
          )}

          <AnimatePresence>
            {isHovered && !imageError && !videoError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-4">
                  {isPlaying ? <PauseIcon className="w-8 h-8 text-white" /> : <PlayIcon className="w-8 h-8 text-white" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!imageError && (
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none rounded-2xl" />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none z-10">
          <span className="font-medium text-base leading-tight truncate drop-shadow-sm block">
            {humanizeFileName(scene.source) || 'Untitled Scene'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
