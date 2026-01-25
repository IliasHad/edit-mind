import React, { useState, useRef, useEffect } from 'react'
import type { Scene } from '@shared/schemas'
import { CheckIcon, PlayIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import { Button } from '@ui/components/Button'

interface PreviewModalProps {
  scene: Scene
  isSelected: boolean
  onClose: () => void
  onToggleSelect: () => void
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ scene, isSelected, onClose, onToggleSelect }) => {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const startTime = scene.startTime || 0
  const endTime = scene.endTime || 0
  const duration = endTime - startTime

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = startTime

    const handleLoadedMetadata = () => {
      video.currentTime = startTime
      video.play().catch(() => setIsPlaying(false))
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)

      if (video.currentTime >= endTime) {
        video.currentTime = startTime
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [startTime, endTime])

  // Keyboard controls for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break

        case ' ':
          e.preventDefault()
          togglePlayPause()
          break

        case 'Enter':
          e.preventDefault()
          onToggleSelect()
          break

        case 'r':
        case 'R':
          e.preventDefault()
          restartScene()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onToggleSelect])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const restartScene = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = startTime
    video.play()
  }

  const progress = duration > 0 ? ((currentTime - startTime) / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative max-w-4xl w-full bg-white dark:bg-black rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 dark:bg-white/50 hover:bg-black/70 dark:hover:bg-white/70 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          variant="ghost"
          size="icon"
          leftIcon={<XMarkIcon className="w-5 h-5 text-white dark:text-black" />}
        />

        <div className="relative aspect-video bg-black group">
          <video
            ref={videoRef}
            src={scene.source ? `/media?source=${encodeURIComponent(scene.source)}` : undefined}
            className="w-full h-full"
            playsInline
          >
            Your browser does not support the video tag.
          </video>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={togglePlayPause}
              className="w-16 h-16 bg-white/90 dark:bg-white/80 hover:bg-white dark:hover:bg-white/90 rounded-full flex items-center justify-center transition-all shadow-xl"
              variant="primary"
              size="xl" // Adjusted size to match the original button's dimensions
              leftIcon={isPlaying ? (
                <PauseIcon className="w-7 h-7 text-black" fill="black" />
              ) : (
                <PlayIcon className="w-7 h-7 text-black ml-0.5" fill="black" />
              )}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-black/70 dark:bg-black/80 backdrop-blur-md p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-white/90 font-mono tabular-nums">
                {formatTime(currentTime - startTime)}
              </span>
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-xs text-white/90 font-mono tabular-nums">{formatTime(duration)}</span>
            </div>
            <div className="text-xs text-white/60">
              Scene: {formatTime(startTime)} - {formatTime(endTime)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-white dark:bg-black">
          <div>
            <h3 className="text-base font-medium text-black/70 dark:text-white/70 truncate">{scene.source}</h3>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              className="flex-1"
              variant={isSelected ? 'primary' : 'outline'}
              leftIcon={isSelected ? <CheckIcon className="w-4 h-4" /> : null}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-2">
                  Selected
                </span>
              ) : (
                'Select Scene'
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>

          <div className="text-center text-xs text-black/40 dark:text-white/40">
            <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 rounded border border-black/10 dark:border-white/10 font-medium">
              Space
            </kbd>{' '}
            play/pause •{' '}
            <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 rounded border border-black/10 dark:border-white/10 font-medium">
              R
            </kbd>{' '}
            restart •{' '}
            <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 rounded border border-black/10 dark:border-white/10 font-medium">
              Enter
            </kbd>{' '}
            select •{' '}
            <kbd className="px-2 py-1 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 rounded border border-black/10 dark:border-white/10 font-medium">
              Esc
            </kbd>{' '}
            close
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}