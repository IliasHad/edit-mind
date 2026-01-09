import { Link } from 'react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserIcon as User, CubeIcon as Package, PhotoIcon as ImageOff } from '@heroicons/react/24/outline'
import { formatDate } from 'date-fns'
import { humanizeSeconds } from '../utils/duration'
import type { JsonArray } from '@prisma/client/runtime/library'

interface VideoMetadata {
  faces?: JsonArray
  emotions?: JsonArray
  objects?: JsonArray
  shotTypes?: JsonArray
}

interface VideoCardProps {
  thumbnailUrl?: string
  duration: number
  createdAt: number
  metadata?: VideoMetadata
  aspectRatio: string | null
  name: string
  id: string
}

export function VideoCard({ thumbnailUrl, duration, createdAt, metadata, aspectRatio, name, id }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isPortrait = aspectRatio === '9:16' ? true : false
  return (
    <Link
      to={`/app/videos/${id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative cursor-pointer overflow-hidden
        bg-white dark:bg-zinc-900
        ring-1 ring-black/5 dark:ring-white/10
        transition-all duration-300 ease-out
        block
        hover:ring-black/10 dark:hover:ring-white/20
        hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30
        rounded-lg
        h-full
        ${isPortrait ? 'row-span-3' : 'row-span-2'}
      `}
      style={{
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <ImageOff className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Preview unavailable</p>
        </div>
      ) : (
        <img
          src={thumbnailUrl ? `/thumbnails/${encodeURIComponent(thumbnailUrl)}` : ''}
          onError={() => setImageError(true)}
          className="
            object-cover w-full h-full
            transition-all duration-300 ease-out
          "
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none"
      />

      {metadata && !imageError && (
        <div className="absolute top-3 right-3 flex gap-2">
          {metadata.faces && metadata.faces.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
              className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs"
            >
              <User className="w-3 h-3" />
              <span>{metadata.faces.length}</span>
            </motion.div>
          )}
          {metadata.objects && metadata.objects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
              className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs"
            >
              <Package className="w-3 h-3" />
              <span>{metadata.objects.length}</span>
            </motion.div>
          )}
        </div>
      )}

      {!imageError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 20,
          }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-4 text-white"
        >
          <h3 className="font-semibold text-sm mb-1 truncate">{name || 'Untitled Video'}</h3>
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>{createdAt && formatDate(createdAt, 'MMM d, yyyy')}</span>
            <span>{humanizeSeconds(duration)}</span>
          </div>
        </motion.div>
      )}

      {!imageError && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isHovered ? 0 : 1 }}
          className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-medium"
        >
          {humanizeSeconds(duration)}
        </motion.div>
      )}
    </Link>
  )
}
