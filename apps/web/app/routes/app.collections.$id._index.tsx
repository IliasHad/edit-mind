import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import type { MetaFunction } from 'react-router'
import type { JsonArray } from '@prisma/client/runtime/library'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import {
  ArrowLeftIcon,
  FilmIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/solid'
import { VideoCard } from '~/features/shared/components/VideoCard'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { humanizeDate } from '~/features/shared/utils/date'
import { useCurrentCollection } from '~/features/collections/hooks/useCurrentCollection'
import { ICON_MAP, TYPE_LABELS } from '~/features/collections/constants'

export const meta: MetaFunction = () => {
  return [{ title: 'Collection Details | Edit Mind' }]
}

type SortOption = 'confidence' | 'date' | 'quality' | 'duration'
type ViewMode = 'grid' | 'list'

export default function CollectionDetail() {
  const navigate = useNavigate()
  const { currentCollection, isLoading } = useCurrentCollection()

  const [sortBy, setSortBy] = useState<SortOption>('confidence')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-12">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-black/50 dark:text-white/50">Loading collection...</p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  if (!currentCollection) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-12">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => navigate('/app/collections')}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-black/50 dark:text-white/50 transition-colors hover:text-black dark:hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Collection Not Found
          </motion.button>
        </main>
      </DashboardLayout>
    )
  }
  const Icon = ICON_MAP[currentCollection.type]

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => navigate('/app/collections')}
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium tracking-wide text-black/50 dark:text-white/50 transition-colors hover:text-black dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Collections
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative mb-10 overflow-hidden rounded-2xl"
        >
          <div className="relative h-80 bg-linear-to-br from-black/95 to-black/80 dark:from-white/5 dark:to-white/10">
            {currentCollection.thumbnailUrl && (
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                src={`/thumbnails/${encodeURIComponent(currentCollection.thumbnailUrl)}`}
                alt={currentCollection.name}
                className="h-full w-full object-cover opacity-30"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-10">
              <div className="mx-auto max-w-[1800px]">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-xl border border-white/20"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium tracking-wide text-white/90">
                    {TYPE_LABELS[currentCollection.type]}
                  </span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mb-3 text-6xl font-semibold tracking-tight text-white"
                >
                  {currentCollection.name}
                </motion.h1>
                {currentCollection.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="max-w-3xl text-lg leading-relaxed text-white/80"
                  >
                    {currentCollection.description}
                  </motion.p>
                )}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="border-t border-white/5 bg-black/80 dark:bg-white/5 backdrop-blur-xl px-10 py-6"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-2.5">
                  <FilmIcon className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white">{currentCollection.itemCount}</span>
                  <span className="text-sm text-white/50">videos</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ClockIcon className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white">
                    {humanizeSeconds(parseInt(currentCollection.totalDuration))}
                  </span>
                  <span className="text-sm text-white/50">duration</span>
                </div>
                {currentCollection.lastUpdated && (
                  <div className="flex items-center gap-2.5">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-white">
                      Updated {humanizeDate(currentCollection.lastUpdated)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
        
        {currentCollection.type === 'b_roll' && (
          <div className="flex my-4 items-center gap-2 self-end-safe">
            <Link
              to={`/app/collections/${currentCollection.id}/scenes`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <VideoCameraIcon className="h-4 w-4" />
              <span>Matched Scenes</span>
            </Link>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto max-w-[1800px]"
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-11 appearance-none rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-black px-4 pr-10 text-sm font-medium tracking-wide text-black dark:text-white transition-all focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
              >
                <option value="confidence">Confidence</option>
                <option value="date">Date Added</option>
                <option value="quality">Quality</option>
                <option value="duration">Duration</option>
              </select>

              <div className="flex items-center gap-1 rounded-full bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`relative rounded-full p-2.5 transition-all duration-300 ${
                    viewMode === 'grid'
                      ? 'text-black dark:text-white'
                      : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                  }`}
                >
                  {viewMode === 'grid' && (
                    <motion.div
                      layoutId="viewMode"
                      className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-sm border border-black/10 dark:border-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Squares2X2Icon className="relative h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`relative rounded-full p-2.5 transition-all duration-300 ${
                    viewMode === 'list'
                      ? 'text-black dark:text-white'
                      : 'text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                  }`}
                >
                  {viewMode === 'list' && (
                    <motion.div
                      layoutId="viewMode"
                      className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-sm border border-black/10 dark:border-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <ListBulletIcon className="relative h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[200px]">
              {currentCollection.items.map((item, index) => {
                const { video } = item
                const isPortrait = video.aspectRatio === '9:16'

                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.02,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    className={`group relative ${isPortrait ? 'row-span-3' : 'row-span-2'}`}
                  >
                    <div className="absolute left-3 bottom-18 z-10">
                      <div
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-xl border ${
                          item.confidence >= 0.9
                            ? 'bg-emerald-500/90 text-white border-emerald-400/20'
                            : item.confidence >= 0.8
                              ? 'bg-amber-500/90 text-white border-amber-400/20'
                              : 'bg-black/50 dark:bg-white/50 text-white dark:text-black border-white/20 dark:border-black/20'
                        }`}
                      >
                        {(item.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <VideoCard
                      key={video.id}
                      id={video.id}
                      thumbnailUrl={video.thumbnailUrl}
                      duration={parseFloat(video.duration.toString())}
                      createdAt={new Date(video.shottedAt).getTime()}
                      metadata={{
                        faces: video.faces as JsonArray,
                        objects: video.objects as JsonArray,
                        emotions: video.emotions as JsonArray,
                        shotTypes: video.shotTypes as JsonArray,
                      }}
                      aspectRatio={video.aspectRatio}
                      name={video.name}
                    />
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {currentCollection.items.map((item, index) => {
                const { video } = item

                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.02,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    className={`group flex cursor-pointer items-center gap-5 rounded-2xl border p-5 transition-all ${'border-black/10 dark:border-white/10 bg-white dark:bg-black hover:border-black/20 dark:hover:border-white/20'}`}
                  >
                    <img
                      src={video.thumbnailUrl ? `/thumbnails/${encodeURIComponent(video.thumbnailUrl)}` : ''}
                      alt={video.name}
                      className="h-24 w-40 shrink-0 rounded-lg object-cover border border-black/10 dark:border-white/10"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1.5 truncate text-base font-semibold tracking-tight text-black dark:text-white">
                        {video.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm font-medium text-black/50 dark:text-white/50">
                        <span>{humanizeSeconds(parseInt(video.duration.toString()))}</span>
                        <span className="h-1 w-1 rounded-full bg-black/40 dark:bg-white/40" />
                        <span>{humanizeDate(video.shottedAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          item.confidence >= 0.9
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : item.confidence >= 0.8
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                              : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70'
                        }`}
                      >
                        {(item.confidence * 100).toFixed(0)}% match
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {currentCollection.items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="mb-6 rounded-2xl bg-black/5 dark:bg-white/5 p-6">
                <MagnifyingGlassIcon className="h-12 w-12 text-black/20 dark:text-white/20" />
              </div>
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-black dark:text-white">No videos found</h3>
            </motion.div>
          )}
        </motion.div>
      </main>
    </DashboardLayout>
  )
}
