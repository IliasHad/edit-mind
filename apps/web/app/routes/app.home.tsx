import { Link, redirect, useLoaderData, useRevalidator } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { VideoCard } from '~/features/shared/components/VideoCard'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { getUser } from '~/services/user.server'
import type { JsonArray } from '@prisma/client/runtime/library'
import { PlusIcon } from '@heroicons/react/24/outline'
import { VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { SortOption, SortOrder } from '~/features/videos/types'
import { SortButton } from '~/features/videos/components/SortButton'
import { Pagination } from '~/features/shared/components/Pagination'
import { useFolders } from '~/features/folders/hooks/useFolders';
import { Button } from '@ui/components/Button';
import { useVideos } from '~/features/videos/hooks/useVideos';
import { useJobs } from '~/features/jobs/hooks/useJobs';
import { motion } from 'framer-motion'
import { JobCard } from '~/features/jobs/components/JobCard';
import { useEffect } from 'react';

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
  const { folders } = useFolders()
  const { importDemoVideos, importVideoSuccess, loading } = useVideos()
  const { jobs, fetchJobs } = useJobs()
  const { revalidate } = useRevalidator()

  const totalPages = Math.ceil(total / limit)

  const handleImportVideos = async () => {
    try {
      await importDemoVideos()
      await revalidate()
      await fetchJobs()
    } catch (error) {
      console.error(error)

    }
  }
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])


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
          {videos.length === 0 && folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/2 p-12 max-w-lg">
                <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No videos indexed yet</h4>
                <p className="text-black/60 dark:text-white/60 text-base mb-8 leading-relaxed">
                  Start by adding your video folders in settings. We'll automatically scan and index your videos
                  locally.
                </p>
                <div className="flex justify-center items-center gap-4">
                  <Link
                    to="/app/settings"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl 
                  bg-black text-white dark:bg-white dark:text-black 
                  hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
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
                    {loading ? (
                      <>
                        <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Importing…
                      </>
                    ) : importVideoSuccess ? (
                      <>
                        <svg className="size-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Demo videos ready
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Import our demo videos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : videos.length === 0 && folders.length > 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="max-w-lg">

                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">  {jobs.length > 0 ? "Indexing your videos ..." : "Scan your folders first"}</h4>
                <p className="text-black/60 dark:text-white/60 text-base mb-8 leading-relaxed">
                  Your {folders.length === 1 ? 'folder is' : `${folders.length} folders are`} connected. Edit Mind is
                  scanning and analyzing your videos in the background.
                </p>
                <Button
                  disabled={loading}
                  variant="primary"
                  className="mt-4 cursor-pointer"
                  onClick={handleImportVideos}
                >
                  {loading ? (
                    <>
                      <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing…
                    </>
                  ) : importVideoSuccess ? (
                    <>
                      <svg className="size-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Demo videos imported
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Import our demo videos
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
            : (
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

                {totalPages > 1 && <Pagination total={totalPages} page={page} />}
              </div>
            )
          }

          {
            videos.length === 0 && folders.length > 0 && jobs.length > 0 &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-3 max-w-7xl"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Processing queue"</h2>
              {jobs.map((job) => (
                <JobCard job={job} />
              ))}
            </motion.div>
          }
        </section >
      </main >
    </DashboardLayout >
  )
}
