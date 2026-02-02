import { Link } from 'react-router'
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { UserIcon, CubeIcon, PhotoIcon } from '@heroicons/react/24/solid'
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
  aspectRatio: string
  metadata?: VideoMetadata
  initialStartTime?: number
  forceMetadataLoad?: boolean
  scenes: SceneAndMatch[]
}

const HOVER_ANIMATION_DURATION = 0.2

export function VideoCard({
  source,
  thumbnailUrl,
  duration,
  createdAt,
  aspectRatio,
  metadata,
  initialStartTime = 0,
  scenes,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const [imageError, setImageError] = useState(false)

  const fileName = source.split('/').pop() || 'Untitled Video'
  const isPortrait = aspectRatio === '9:16'

  const hasPartialMatches = scenes.filter((scene) => scene.matched).length > 0

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const videoUrl = `/app/videos?source=${encodeURIComponent(source)}&startTime=${initialStartTime}`
  const thumbnailSrc = thumbnailUrl ? `/thumbnails/${encodeURIComponent(thumbnailUrl)}` : ''

  return (
    <Link
      to={videoUrl}
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
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(false)}
    >
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
        </>
      )}

      {hasPartialMatches && !imageError && (
        <div className="absolute bottom-0 left-0 z-20 h-10 w-full">
          <ProgressBar scenes={scenes} duration={duration} />
        </div>
      )}

      {!hasPartialMatches && !imageError && (
        <div className="absolute bottom-0 left-0 z-20 h-10 w-full">
          <div className="relative flex-1 w-full h-full">
            <div className="absolute bg-green-500 h-1 bottom-0 right-0 left-0" />
          </div>
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

      <Link to={videoUrl} aria-label={`View ${fileName} details`}>
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
    </Link>
  )
}
