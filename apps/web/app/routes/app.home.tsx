import { Link, redirect, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { getUser } from '~/services/user.server'
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { VideoModel, CollectionModel, FolderModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { getAllKnownFaces, getAllUnknownFaces } from '@shared/utils/faces'
import { useFolders } from '~/features/folders/hooks/useFolders'
import { useVideos } from '~/features/videos/hooks/useVideos'
import { useState } from 'react'
import { useRevalidator } from 'react-router'
import { Button } from '@ui/components/Button'
import { getTimeOfDay } from '~/features/shared/utils/day'
import { VideoCard } from '~/features/shared/components/VideoCard'
import { SortButton } from '~/features/videos/components/SortButton'
import { Pagination } from '~/features/shared/components/Pagination'
import type { SortOption, SortOrder } from '~/features/videos/types'
import type { JsonArray } from '@prisma/client/runtime/library'

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)
    if (!user) return redirect('/auth/login')

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const sortBy = (url.searchParams.get('sortBy') || 'shottedAt') as SortOption
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as SortOrder
    const offset = (page - 1) * limit

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const [
      totalVideos,
      newVideosCount,
      videos,
      recentCollections,
      personCollections,
      knownFacesData,
      unknownFacesData,
      folders,
    ] = await Promise.all([
      VideoModel.count({ where: { userId: user.id } }),
      VideoModel.count({ where: { userId: user.id, importAt: { gte: yesterday } } }),
      VideoModel.findMany({
        where: { userId: user.id },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      CollectionModel.findMany({
        where: { userId: user.id },
        orderBy: { lastUpdated: 'desc' },
        take: 6,
      }),
      CollectionModel.findMany({
        where: { userId: user.id, type: 'person' },
        orderBy: { itemCount: 'desc' },
      }),
      getAllKnownFaces(),
      getAllUnknownFaces(),
      FolderModel.findMany({ where: { userId: user.id } }),
    ])

    const personVideoCounts = new Map(personCollections.map((c) => [c.name, c.itemCount]))
    const knownFaces = knownFacesData
      ? Object.entries(knownFacesData).map(([name, images]) => ({
        name,
        images,
        videoCount: personVideoCounts.get(name) ?? 0,
      }))
      : []

    return {
      totalVideos,
      newVideosCount,
      videos,
      page,
      limit,
      sortBy,
      sortOrder,
      recentCollections: recentCollections.map((c) => ({
        id: c.id,
        name: c.name,
        itemCount: c.itemCount,
        thumbnailUrl: c.thumbnailUrl,
      })),
      knownFaces,
      unknownCount: unknownFacesData.faces.length,
      hasFolders: folders.length > 0,
    }
  } catch (error) {
    logger.error(error)
    return {
      totalVideos: 0,
      newVideosCount: 0,
      videos: [],
      page: 1,
      limit: 20,
      sortBy: 'shottedAt' as SortOption,
      sortOrder: 'desc' as SortOrder,
      recentCollections: [],
      knownFaces: [],
      unknownCount: 0,
      hasFolders: false,
    }
  }
}

export default function Dashboard() {
  const {
    totalVideos,
    newVideosCount,
    videos,
    page,
    limit,
    sortBy,
    sortOrder,
    recentCollections,
    knownFaces,
    unknownCount,
    hasFolders,
  } = useLoaderData<typeof loader>()

  const { folders } = useFolders()
  const { importDemoVideos, importVideoSuccess, loading } = useVideos()
  const { revalidate } = useRevalidator()
  const [timeLabel] = useState(getTimeOfDay)

  const handleImportVideos = async () => {
    try {
      await importDemoVideos()
      await revalidate()
    } catch (error) {
      console.error(error)
    }
  }

  const totalPages = Math.ceil(totalVideos / limit)

  if (totalVideos === 0 && !hasFolders) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-20">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-12 max-w-lg">
              <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
              <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No videos indexed yet</h4>
              <p className="text-black/60 dark:text-white/60 text-base mb-8 leading-relaxed">
                Start by adding your video folders in settings. We'll automatically scan and index your videos locally.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Link
                  to="/app/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                >
                  <PlusIcon className="size-4" />
                  Add folders to start
                </Link>
                <Button
                  disabled={loading}
                  variant="ghost"
                  onClick={handleImportVideos}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium cursor-pointer"
                >
                  {loading ? 'Importing…' : importVideoSuccess ? 'Demo videos ready' : 'Import our demo videos'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  if (totalVideos === 0 && hasFolders) {
    return (
      <DashboardLayout sidebar={<Sidebar />}>
        <main className="w-full px-8 py-20">
          <div className="flex flex-col items-center justify-center text-center py-8 max-w-lg mx-auto">
            <h4 className="text-xl font-semibold text-black dark:text-white mb-3">Indexing your videos…</h4>
            <p className="text-black/60 dark:text-white/60 text-base mb-8 leading-relaxed">
              Your {folders.length === 1 ? 'folder is' : `${folders.length} folders are`} connected. Edit Mind is
              scanning and analyzing your videos in the background.
            </p>
            <Button disabled={loading} variant="primary" className="mt-4 cursor-pointer" onClick={handleImportVideos}>
              {loading ? 'Importing…' : importVideoSuccess ? 'Demo videos imported' : 'Import our demo videos'}
            </Button>
          </div>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-10 space-y-10">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-3">{timeLabel}</p>
          <h1 className="text-5xl font-bold text-white tracking-tight leading-tight mb-3">
            {newVideosCount > 0 ? (
              <>{newVideosCount} new video{newVideosCount !== 1 ? 's' : ''} since yesterday.</>
            ) : (
              <>{totalVideos.toLocaleString()} videos indexed.</>
            )}
          </h1>
          <p className="text-base text-white/50 max-w-lg leading-relaxed">
            Browse by who's in it, where it was shot, or how it looks — all detected locally on this machine.
          </p>
        </div>

        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">My Videos</h2>
              <p className="text-sm text-white/40 mt-1">
                {totalVideos} {totalVideos === 1 ? 'video' : 'videos'} total
              </p>
            </div>
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[200px]">
            {videos.map((video) => (
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
            ))}
          </div>
          {totalPages > 1 && <Pagination total={totalPages} page={page} />}
        </section>

        {recentCollections.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">Collections</h2>
              <Link
                to="/app/collections"
                className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                See all
                <ChevronRightIcon className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {recentCollections.map((col) => (
                <Link
                  key={col.id}
                  to={`/app/collections/${col.id}`}
                  className="group relative rounded-xl overflow-hidden aspect-4/3 bg-zinc-900"
                >
                  {col.thumbnailUrl ? (
                    <img
                      src={`/thumbnails/${encodeURIComponent(col.thumbnailUrl)}`}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white">{col.name}</p>
                    <p className="text-xs text-white/60">{col.itemCount} videos</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {knownFaces.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-semibold text-white">People</h2>
                <span className="text-sm text-white/40">
                  {knownFaces.length} known{unknownCount > 0 ? ` · ${unknownCount} unknown` : ''}
                </span>
              </div>
              <Link
                to="/app/faces?tab=unknown"
                className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Label faces
                <ChevronRightIcon className="size-3.5" />
              </Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-none">
              {knownFaces.map((face) => (
                <Link
                  key={face.name}
                  to={`/app/faces/${encodeURIComponent(face.name)}`}
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div className="size-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/30 transition-colors">
                    {face.images.length > 0 ? (
                      <img src={`/faces/${face.images[0]}`} alt={face.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-white/30 text-xl font-semibold">{face.name[0].toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    {face.name}
                  </p>
                  {face.videoCount > 0 && <p className="text-xs text-white/30">{face.videoCount} videos</p>}
                </Link>
              ))}
              {unknownCount > 0 && (
                <Link to="/app/faces?tab=unknown" className="flex flex-col items-center gap-2 shrink-0 group">
                  <div className="size-20 rounded-full border-2 border-dashed border-white/15 group-hover:border-white/30 transition-colors flex items-center justify-center bg-white/3">
                    <PlusIcon className="size-6 text-white/30 group-hover:text-white/50 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors">
                    Unknown
                  </p>
                  <p className="text-xs text-white/30">{unknownCount} videos</p>
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </DashboardLayout>
  )
}
