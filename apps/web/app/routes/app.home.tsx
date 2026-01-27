import { Link, redirect, useLoaderData, useNavigate, useSearchParams } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { VideoCard } from '~/features/shared/components/VideoCard'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { getUser } from '~/services/user.sever'
import type { JsonArray } from '@prisma/client/runtime/library'
import { PlusIcon } from '@heroicons/react/24/outline'
import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { SortOption, SortOrder } from '~/features/videos/types'
import { SortButton } from '~/features/videos/components/SortButton'

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const sortBy = (url.searchParams.get('sortBy') || 'shottedAt') as SortOption
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as SortOrder

  const offset = (page - 1) * limit

  try {
    const user = await getUser(request)
    if (!user) return redirect('/auth/login')

    const videos = await VideoModel.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: limit,
      skip: offset,
    })

    const total = await VideoModel.count({
      where: {
        userId: user.id,
      },
    })

    return { videos, page, limit, total, sortBy, sortOrder }
  } catch (error) {
    logger.error(error)
    return { videos: [], page, limit, total: 0, sortBy: 'shottedAt' as SortOption, sortOrder: 'desc' as SortOrder }
  }
}

export default function Dashboard() {
  const { videos, total, page, limit, sortBy, sortOrder } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const totalPages = Math.ceil(total / limit)

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-semibold text-black dark:text-white tracking-tight mb-6 leading-tight">
            My videos gallery's
            <br />
            second brain.
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60 max-w-2xl mx-auto leading-relaxed">
            Organize your video library locally and search with natural language.
            <br />
            All processing happens securely on your device.
          </p>
        </div>

        <section>
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-12 max-w-lg">
                <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No videos indexed yet</h4>
                <p className="text-black/60 dark:text-white/60 text-base mb-8 leading-relaxed">
                  Start by adding your video folders in settings. We'll automatically scan and index your videos
                  locally.
                </p>
                <Link
                  to="/app/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl 
                  bg-black text-white dark:bg-white dark:text-black 
                  hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                >
                  <PlusIcon className="size-4" />
                  Add folders to start
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8 mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-black dark:text-white">My Videos</h3>
                  <p className="text-sm text-black/50 dark:text-white/50 mt-1">
                    {total} {total === 1 ? 'video' : 'videos'} total
                  </p>
                </div>

                <div className="flex items-center gap-2">
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

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-8">
                  <button
                    disabled={page === 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams)
                      params.set('page', (page - 1).toString())
                      navigate(`?${params.toString()}`)
                    }}
                    className="px-5 py-2.5 text-sm font-medium rounded-xl
                      bg-white dark:bg-black 
                      text-black/70 dark:text-white/70
                      border border-black/10 dark:border-white/10
                      hover:bg-black/5 dark:hover:bg-white/5
                      transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-black/60 dark:text-white/60 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams)
                      params.set('page', (page + 1).toString())
                      navigate(`?${params.toString()}`)
                    }}
                    className="px-5 py-2.5 text-sm font-medium rounded-xl
                      bg-white dark:bg-black 
                      text-black/70 dark:text-white/70
                      border border-black/10 dark:border-white/10
                      hover:bg-black/5 dark:hover:bg-white/5
                      transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
