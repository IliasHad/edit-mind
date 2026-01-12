import { Link } from 'react-router'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserIcon, 
  CubeIcon, 
  PhotoIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import type { SceneAndMatch } from '@shared/types/video'
import { ProgressBar } from './ProgressBar'

interface VideoMetadata {
  faces?: string[]
  emotions?: string[]
  objects?: string[]
  shotTypes?: string[]
}

interface VideoCardProps {
  source: string
  thumbnailUrl?: string
  duration: number
  createdAt: number
  aspectRatio: '16:9' | '9:16'
  metadata?: VideoMetadata
  initialStartTime?: number
  forceMetadataLoad?: boolean
  scenes: SceneAndMatch[]
}

interface MatchedRange {
  start: number
  end: number
}

const HOVER_ANIMATION_DURATION = 0.2
const PROGRESS_UPDATE_THRESHOLD = 0.1

export function VideoCard({
  source,
  thumbnailUrl,
  duration,
  createdAt,
  aspectRatio = '16:9',
  metadata,
  initialStartTime = 0,
  forceMetadataLoad = false,
  scenes,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageError, setImageError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const sceneIndexRef = useRef(0)
  const isTransitioningRef = useRef(false)

  const fileName = source.split('/').pop() || 'Untitled Video'
  const isPortrait = aspectRatio === '9:16'

  const matchedRanges: MatchedRange[] = scenes
    .filter((scene) => scene.matched)
    .map((scene) => ({ start: scene.startTime, end: scene.endTime }))
    .sort((a, b) => a.start - b.start)

  const hasMatchedScenes = matchedRanges.length > 0
  const hasPartialMatches = scenes.some((scene) => !scene.matched)

  const playNextScene = useCallback(() => {
    const video = videoRef.current
    if (!video || isTransitioningRef.current) return

    const scene = matchedRanges[sceneIndexRef.current]
    if (!scene) return

    isTransitioningRef.current = true

    // Seek to the start of the matched scene
    video.currentTime = scene.start
    setIsLoading(true)
    video
      .play()
      .then(() => {
        setIsPlaying(true)
        setIsLoading(false)
        isTransitioningRef.current = false
      })
      .catch(() => {
        setIsLoading(false)
        isTransitioningRef.current = false
      })
  }, [matchedRanges])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !hasMatchedScenes || !video.played) return
    const currentScene = matchedRanges[sceneIndexRef.current]
    if (!currentScene) return

    const sceneDuration = currentScene.end - currentScene.start
    const sceneProgress = video.currentTime - currentScene.start

    // Update progress bar
    const progressPercentage = (sceneProgress / sceneDuration) * 100
    setProgress(Math.min(Math.max(progressPercentage, 0), 100))

    // Check if we need to advance to the next scene
    if (video.currentTime >= currentScene.end - PROGRESS_UPDATE_THRESHOLD) {
      sceneIndexRef.current = (sceneIndexRef.current + 1) % matchedRanges.length
      playNextScene()
    }
  }, [hasMatchedScenes, matchedRanges, playNextScene])

  const handleLoadedMetadata = useCallback(() => {
    if (hasMatchedScenes) {
      setIsLoading(true)
      playNextScene()
    }
  }, [hasMatchedScenes, playNextScene])

  const handlePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      setIsPlaying(false)
      video.pause()
      return
    }
    setIsLoading(true)

    // Initialize video source
    const mediaUrl = `/media?source=${encodeURIComponent(source)}`
    video.setAttribute('src', mediaUrl)
    video.load()
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.pause()
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [handleLoadedMetadata, handleTimeUpdate])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const handleVideoError = useCallback(() => {
    setIsLoading(false)
  }, [])

  const videoUrl = `/app/videos?source=${encodeURIComponent(source)}&startTime=${initialStartTime}`
  const thumbnailSrc = thumbnailUrl ? `/thumbnails/${encodeURIComponent(thumbnailUrl)}` : ''
  const mediaUrl = forceMetadataLoad ? `/media?source=${encodeURIComponent(source)}` : undefined

  return (
    <div
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      className={`
        relative block h-full cursor-pointer overflow-hidden
        rounded-sm bg-white dark:bg-zinc-900
        ring-1 ring-black/5 dark:ring-white/10
        transition-all duration-300 ease-out
        hover:ring-black/10 hover:shadow-2xl hover:shadow-black/10
        dark:hover:ring-white/20 dark:hover:shadow-black/30
        ${isPortrait ? 'row-span-3' : 'row-span-2'}
      `}
      aria-label={`View ${fileName}`}
    >
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isHovered || !isPlaying ? 1 : 0, y: isHovered || !isPlaying ? 0 : 20 }}
          className="absolute flex items-center justify-center h-full w-full bg-black/20 gap-4 pointer-events-auto"
        >
          <button
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white hover:bg-white/90 transition-all active:scale-95 shadow-lg  z-100"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            onClick={handlePlay}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </motion.div>
      )}
      {imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <PhotoIcon className="mb-2 h-12 w-12 text-zinc-400 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Preview unavailable</p>
        </div>
      ) : (
        <>
          <img
            src={thumbnailSrc}
            alt={`${fileName} thumbnail`}
            onError={handleImageError}
            className="h-full w-full object-cover transition-all duration-300 ease-out"
          />

          <video
            ref={videoRef}
            src={mediaUrl}
            preload={forceMetadataLoad ? 'metadata' : 'none'}
            playsInline
            controls={false}
            onError={handleVideoError}
            className={`
              absolute inset-0 h-full w-full rounded-2xl object-cover
              transition-opacity duration-300
              ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
              ${isPlaying ? 'opacity-100' : 'opacity-0'}
            `}
            aria-hidden="true"
          />
        </>
      )}

      <AnimatePresence>
        {isLoading && isHovered && !imageError && hasMatchedScenes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <ArrowPathIcon className="h-8 w-8 animate-spin text-white" />
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs font-medium text-white"
              >
                Loading preview...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHovered && !imageError && hasMatchedScenes && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 z-30 h-1 w-full overflow-hidden rounded-b-2xl bg-white/20"
          >
            <motion.div
              className="h-full bg-white"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {hasPartialMatches && !imageError && (
        <div className="absolute bottom-0 left-0 z-20 h-1 w-full overflow-hidden rounded-b-2xl bg-white/20">
          <ProgressBar scenes={scenes} duration={duration} />
        </div>
      )}

      {metadata && !imageError && (
        <div className="absolute right-3 top-3 flex gap-2">
          {metadata.faces && metadata.faces.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.8,
              }}
              transition={{ duration: HOVER_ANIMATION_DURATION }}
              className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm"
              aria-label={`${metadata.faces.length} faces detected`}
            >
              <UserIcon className="h-3 w-3" />
              <span>{metadata.faces.length}</span>
            </motion.div>
          )}
          {metadata.objects && metadata.objects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.8,
              }}
              transition={{ duration: HOVER_ANIMATION_DURATION }}
              className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm"
              aria-label={`${metadata.objects.length} objects detected`}
            >
              <CubeIcon className="h-3 w-3" />
              <span>{metadata.objects.length}</span>
            </motion.div>
          )}
        </div>
      )}

      <Link to={videoUrl}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 20,
          }}
          transition={{ duration: HOVER_ANIMATION_DURATION }}
          className="absolute bottom-0 left-0 right-0 p-4 text-white"
        >
          <h3 className="mb-1 truncate text-sm font-semibold">{fileName}</h3>
          <div className="flex items-center justify-between text-xs text-white/80">
            <time dateTime={new Date(createdAt).toISOString()}>{format(new Date(createdAt), 'MMM d, yyyy')}</time>
            <span>{humanizeSeconds(duration)}</span>
          </div>
        </motion.div>
      </Link>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isHovered ? 0 : 1 }}
        transition={{ duration: HOVER_ANIMATION_DURATION }}
        className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
      >
        {humanizeSeconds(duration)}
      </motion.div>
    </div>
  )
}
