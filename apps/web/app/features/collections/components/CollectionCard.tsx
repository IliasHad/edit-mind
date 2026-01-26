import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'

import { humanizeSeconds } from '~/features/shared/utils/duration'
import { ICON_MAP, TYPE_LABELS } from '~/features/collections/constants'
import type { CollectionWithItems } from '../types'

interface CollectionCardProps {
  collection: CollectionWithItems
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
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative aspect-video overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200"
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
          <div className="flex h-full w-full items-center justify-center bg-white/5">
            <Icon className="h-20 w-20 text-white/10" />
          </div>
        )}

        {isHovered ? (
          <motion.div
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 bg-linear-to-t from-black/80 via-black/60 to-transparent"
          />
        ) : (
          <motion.div
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 bg-linear-to-b from-black/80 via-black/60 to-transparent"
          />
        )}

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
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 backdrop-blur-xl border border-white/10"
              >
                <Icon className="h-3.5 w-3.5 text-white/90" />
                <span className="text-[11px] font-semibold tracking-wide text-white/90 uppercase">
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
                className="rounded-lg flex items-center justify-center bg-white/5 px-2.5 py-1.5 backdrop-blur-xl border border-white/10"
              >
                <span className="text-sm font-semibold text-white/90">{collection.itemCount}</span>
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
              <h3 className="mb-1.5 text-xl font-semibold tracking-tight text-white drop-shadow-lg">
                {collection.name}
              </h3>
              {collection.description && (
                <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-white/80 drop-shadow">
                  {collection.description}
                </p>
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
