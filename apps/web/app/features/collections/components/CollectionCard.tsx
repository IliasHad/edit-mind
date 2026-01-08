import { useState } from 'react';
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'

import { humanizeSeconds } from '~/features/shared/utils/duration'
import type { Collection } from '@prisma/client'
import { ICON_MAP, TYPE_LABELS } from '~/features/collections/constants'
import { PlayIcon } from '@heroicons/react/24/solid';

interface CollectionCardProps {
  collection: Collection & { totalDuration: number }
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const Icon = ICON_MAP[collection.type]

  return (
    <Link
      to={`/app/collections/${collection.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative block"
    >
      <motion.div
        initial={false}
        animate={{ scale: isHovered ? 0.98 : 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative aspect-video overflow-hidden rounded-2xl bg-black/95 dark:bg-white/5 border border-black/10 dark:border-white/10"
      >
        {!imageError && collection.thumbnailUrl ? (
          <motion.img
            src={`/thumbnails/${encodeURIComponent(collection.thumbnailUrl)}`}
            onError={() => setImageError(true)}
            alt={collection.name}
            className="h-full w-full object-cover"
            animate={{ scale: isHovered ? 1.08 : 1 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/5 dark:bg-white/5">
            <Icon className="h-20 w-20 text-black/10 dark:text-white/10" />
          </div>
        )}

        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent"
        />

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 dark:bg-white/90 backdrop-blur-xl shadow-2xl">
                <PlayIcon className="h-7 w-7 text-black ml-1" fill="black" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 p-5">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <motion.div
                initial={false}
                animate={{
                  opacity: isHovered ? 0 : 1,
                  y: isHovered ? -8 : 0,
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/40 dark:bg-white/10 px-2.5 py-1 backdrop-blur-xl border border-white/10"
              >
                <Icon className="h-3 w-3 text-white/90" />
                <span className="text-[11px] font-medium tracking-wide text-white/90">
                  {TYPE_LABELS[collection.type]}
                </span>
              </motion.div>

              <motion.div
                initial={false}
                animate={{
                  opacity: isHovered ? 0 : 1,
                  y: isHovered ? -8 : 0,
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="rounded-full flex items-center justify-center bg-black/40 dark:bg-white/10 h-8 w-8 backdrop-blur-xl border border-white/10"
              >
                <span className="text-sm font-medium text-white/90">{collection.itemCount}</span>
              </motion.div>
            </div>

            <motion.div
              initial={false}
              animate={{
                opacity: isHovered ? 1 : 0,
                y: isHovered ? 0 : 12,
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <h3 className="mb-1.5 text-xl font-semibold tracking-tight text-white">{collection.name}</h3>
              {collection.description && (
                <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-white/70">{collection.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs font-medium text-white/60">
                <span>{collection.itemCount} Videos</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>{humanizeSeconds(parseInt(collection.totalDuration))}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
