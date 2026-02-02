import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
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
} from '@heroicons/react/24/outline'
import { VideoCard } from '~/features/shared/components/VideoCard'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { smartFormatDate } from '@shared/utils/duration'
import { useCurrentCollection } from '~/features/collections/hooks/useCurrentCollection'
import { ICON_MAP, TYPE_LABELS } from '~/features/collections/constants'
import { Button } from '@ui/components/Button'
import { SortButton } from '~/features/videos/components/SortButton'
import { PageSkeleton } from '~/features/collections/components/PageSkeleton'

export const meta: MetaFunction = () => {
  return [{ title: 'Collection Details | Edit Mind' }]
}

type ViewMode = 'grid' | 'list'

export default function CollectionDetail() {
  const navigate = useNavigate()
  const { currentCollection, sortOrder, sortBy, loading, error } = useCurrentCollection()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  if (loading) {
    return <PageSkeleton />
  }

  if (error) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-12">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
              <MagnifyingGlassIcon className="h-12 w-12 text-red-400 mx-auto" />
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">Error Loading Collection</h3>
            <p className="text-white/60 mb-6">{error}</p>
            <Button variant="glass" onClick={() => navigate('/app/collections')} leftIcon={<ArrowLeftIcon />}>
              Back to Collections
            </Button>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  if (!currentCollection) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-12">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-6">
              <MagnifyingGlassIcon className="h-12 w-12 text-white/20 mx-auto" />
            </div>
            <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">Collection Not Found</h3>
            <p className="text-white/60 mb-6">The collection you're looking for doesn't exist.</p>
            <Button variant="glass" onClick={() => navigate('/app/collections')} leftIcon={<ArrowLeftIcon />}>
              Back to Collections
            </Button>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  const Icon = ICON_MAP[currentCollection.type]

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCollection.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            <div className="relative h-80">
              {currentCollection.thumbnailUrl && (
                <motion.img
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                  src={`/thumbnails/${encodeURIComponent(currentCollection.thumbnailUrl)}`}
                  alt={currentCollection.name}
                  className="h-full w-full object-cover opacity-30"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-10">
                <div className="mx-auto max-w-7xl">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-xl border border-white/20"
                  >
                    <Icon className="w-3.5 h-3.5 text-white/90" />
                    <span className="text-xs font-semibold tracking-wide text-white/90 uppercase">
                      {TYPE_LABELS[currentCollection.type]}
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="mb-3 text-6xl font-semibold tracking-tight text-white drop-shadow-lg"
                  >
                    {currentCollection.name}
                  </motion.h1>

                  {currentCollection.description && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="max-w-3xl text-lg leading-relaxed text-white/80 drop-shadow"
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
              transition={{ duration: 0.3, delay: 0.25 }}
              className="border-t border-white/10 bg-white/5 backdrop-blur-xl px-10 py-6"
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between">
                <div className="flex items-center gap-12">
                  <div className="flex items-center gap-2.5">
                    <FilmIcon className="h-4 w-4 text-white/50" />
                    <span className="text-sm font-semibold text-white">{currentCollection.itemCount}</span>
                    <span className="text-sm text-white/50">videos</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ClockIcon className="h-4 w-4 text-white/50" />
                    <span className="text-sm font-semibold text-white">
                      {humanizeSeconds(parseInt(currentCollection.totalDuration))}
                    </span>
                    <span className="text-sm text-white/50">duration</span>
                  </div>
                  {currentCollection.lastUpdated && (
                    <div className="flex items-center gap-2.5">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">
                        Updated {smartFormatDate(currentCollection.lastUpdated)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {currentCollection.type === 'b_roll' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex my-4 items-center gap-2"
          >
            <Link to={`/app/collections/${currentCollection.id}/scenes`}>
              <Button variant="glass" leftIcon={<VideoCameraIcon />}>
                Matched Scenes
              </Button>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mx-auto max-w-[1800px]"
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2">
                <Button
                  onClick={() => setViewMode('grid')}
                  size="icon-md"
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  size="icon-md"
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </Button>
              </div>

              {sortBy && sortOrder &&
                <SortButton
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  options={[
                    { value: 'shottedAt', label: 'Shot Date' },
                    { value: 'importAt', label: 'Import Date' },
                    { value: 'updatedAt', label: 'Last Updated' },
                    { value: 'duration', label: 'Duration' },
                  ]}
                />
              }
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[200px]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm animate-pulse"
                  />
                ))}
              </motion.div>
            ) : viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[200px]"
              >
                {currentCollection.items.map((item, index) => {
                  const { video } = item
                  const isPortrait = video.aspectRatio === '9:16'

                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.02,
                      }}
                      className={`group relative ${isPortrait ? 'row-span-3' : 'row-span-2'}`}
                    >
                      <div className="absolute left-3 top-3 z-10">
                        <div
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-xl border ${item.confidence >= 0.9
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : item.confidence >= 0.8
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-white/10 text-white border-white/20'
                            }`}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      <VideoCard
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
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
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
                      }}
                      className="group flex cursor-pointer items-center gap-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:bg-white/[0.07] transition-all"
                    >
                      <img
                        src={video.thumbnailUrl ? `/thumbnails/${encodeURIComponent(video.thumbnailUrl)}` : ''}
                        alt={video.name}
                        className="h-24 w-40 shrink-0 rounded-lg object-cover border border-white/10"
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1.5 truncate text-base font-semibold tracking-tight text-white">
                          {video.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm font-medium text-white/50">
                          <span>{humanizeSeconds(parseInt(video.duration.toString()))}</span>
                          <span className="h-1 w-1 rounded-full bg-white/40" />
                          <span>{smartFormatDate(video.shottedAt)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${item.confidence >= 0.9
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : item.confidence >= 0.8
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-white/5 border-white/10 text-white/70'
                            }`}
                        >
                          {(item.confidence * 100).toFixed(0)}% match
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && currentCollection.items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-6">
                <MagnifyingGlassIcon className="h-12 w-12 text-white/20" />
              </div>
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">No videos found</h3>
              <p className="text-white/60">This collection doesn't have any videos yet.</p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </DashboardLayout>
  )
}
