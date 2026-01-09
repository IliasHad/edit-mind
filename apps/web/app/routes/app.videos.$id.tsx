import { useEffect, useState } from 'react'
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router'
import { deleteByVideoSource, getByVideoSource, updateScenesSource } from '@vector/services/vectorDb'
import { existsSync } from 'fs'
import { getUser } from '~/services/user.sever'
import fs from 'fs/promises'
import { videoActionSchema } from '~/features/videos/schemas'
import { PROCESSED_VIDEOS_DIR, THUMBNAILS_DIR } from '@shared/constants'
import path from 'path'
import { logger } from '@shared/services/logger'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { DeleteVideo } from '~/features/videos/components/DeleteVideo'
import { ReindexVideo } from '~/features/videos/components/ReindexVideo'
import { VideoHeader } from '~/features/videos/components/VideoHeader'
import { ActiveSceneCard } from '~/features/videos/components/ActiveSceneCard'
import { ProcessingJobDetails } from '~/features/videos/components/ProcessingJobDetails'
import { ScenesSidebar } from '~/features/videos/components/ScenesSidebar'
import { useKeyboardNavigation } from '~/features/videos/hooks/useKeyboardNavigation'
import { CollectionModel, JobModel, ProjectModel, VideoModel } from '@db/index'
import { CustomVideoPlayer } from '~/features/customVideoPlayer/components'
import { RelinkVideo } from '~/features/videos/components/RelinkVideo'
import { backgroundJobsFetch } from '~/services/background.server'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params

  if (!id) {
    throw new Response('Video ID not found', { status: 404 })
  }

  const videoDb = await VideoModel.findById(id)

  if (!videoDb) {
    throw new Response('Video not found', { status: 404 })
  }

  const { source, importAt } = videoDb

  const video = await getByVideoSource(decodeURIComponent(source))
  const videoExist = existsSync(source)

  const collections = await CollectionModel.findMany({
    where: {
      items: {
        some: {
          video: {
            source: decodeURIComponent(source),
          },
        },
      },
    },
    include: {
      items: {
        include: {
          video: {
            select: {
              id: true,
              source: true,
            },
          },
        },
      },
    },
  })

  const projects = await ProjectModel.findMany({
    where: {
      videos: {
        some: {
          source: decodeURIComponent(source),
        },
      },
    },
    include: {
      videos: {
        select: {
          id: true,
        },
      },
    },
  })

  const processingJobsCount = await JobModel.count({
    where: {
      videoPath: decodeURIComponent(source),
      status: {
        in: ['pending', 'processing'],
      },
    },
  })

  const job = await JobModel.findFirst({
    where: {
      videoPath: decodeURIComponent(source),
      frameAnalysisTime: {
        not: null,
      },
      sceneCreationTime: {
        not: null,
      },
      transcriptionTime: {
        not: null,
      },
      textEmbeddingTime: {
        not: null,
      },
      visualEmbeddingTime: {
        not: null,
      },
      audioEmbeddingTime: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (!video || video.scenes.length === 0) {
    throw new Response('Scenes not found', { status: 404 })
  }

  const totalProcessingTime =
    (job?.audioEmbeddingTime || 0) +
    (job?.frameAnalysisTime || 0) +
    (job?.sceneCreationTime || 0) +
    (job?.audioEmbeddingTime || 0) +
    (job?.textEmbeddingTime || 0) +
    (job?.visualEmbeddingTime || 0)

  const processingRatio = (parseInt(video.duration.toString() || '0') / totalProcessingTime) * 100

  return {
    scenes: video.scenes,
    source,
    videoExist,
    collections,
    projects,
    job: {
      ...job,
      fileSize: BigInt(job?.fileSize || '0'),
    },
    processingRatio,
    importAt,
    processingJobsCount,
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const user = await getUser(request)
    if (!user) return { success: false, error: 'No user authenticated' }

    const form = await request.formData()
    const parsed = videoActionSchema.safeParse(Object.fromEntries(form))

    if (!parsed.success) {
      console.error(parsed.error)
      return { success: false, error: 'Invalid action payload' }
    }

    const action = parsed.data

    const { id } = params

    if (!id) {
      throw new Response('Video ID not found', { status: 404 })
    }

    const videoDb = await VideoModel.findById(id)

    if (!videoDb) {
      throw new Response('Video not found', { status: 404 })
    }

    if (action.intent === 'relink-video') {
      const { oldSource, newSource } = action

      try {
        await fs.access(newSource)

        await JobModel.updateMany({
          where: { videoPath: oldSource },
          data: { videoPath: newSource },
        })

        await VideoModel.updateBySource(oldSource, user.id, {
          source: newSource,
        })

        await updateScenesSource(oldSource, newSource)
        return { success: true, redirectLink: `/app/videos?source=${newSource}` }
      } catch {
        return { success: false, error: 'Failed to access or create folder/video' }
      }
    }

    if (action.intent === 'reindex-video') {
      try {
        const { source } = action
        const videoDb = await VideoModel.findById(id)

        if (videoDb) {
          const job = await JobModel.create({
            videoPath: source,
            userId: user.id,
            folderId: videoDb?.folderId,
            fileSize: BigInt(0),
          })
          await backgroundJobsFetch(
            '/indexer',
            { videoPath: source, forceReIndexing: true, priority: 1, jobId: job.id },
            user
          )
          return { success: true }
        }
      } catch (error) {
        logger.error('Error re-indexing video: ' + error)
        return { success: false, error: 'Failed to re-index video .' }
      }
    }
    if (action.intent === 'delete-video') {
      const { source } = action
      try {
        const video = await getByVideoSource(source)

        if (video && video.scenes) {
          const thumbnailDir = THUMBNAILS_DIR

          for (const scene of video.scenes) {
            if (scene.thumbnailUrl) {
              const thumbPath = path.join(thumbnailDir, scene.thumbnailUrl)
              if (existsSync(thumbPath)) {
                await fs.unlink(thumbPath)
              }
            }
          }

          await deleteByVideoSource(source)

          await JobModel.deleteMany({
            where: { videoPath: source },
          })

          await VideoModel.delete(videoDb.id)
        }
        const videoFileName = path.basename(source)
        const analysisResultDir = path.join(PROCESSED_VIDEOS_DIR, videoFileName)
        if (existsSync(analysisResultDir)) {
          await fs.rm(analysisResultDir, { recursive: true, force: true })
        }

        return { success: true }
      } catch (e) {
        logger.error('Error deleting video: ' + e)
        return { success: false, error: 'Failed to delete video and its assets.' }
      }
    }
  } catch (error) {
    logger.error(error)
    return { success: false, error: 'Failed to update video' }
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.source) {
    return [{ title: 'Video not found | Edit Mind' }]
  }

  const fileName = data.source.split('/').pop() || 'File'

  return [
    {
      title: `${fileName} | Edit Mind`,
    },
  ]
}

export default function Video() {
  const data = useLoaderData<typeof loader>()
  const relinkFetcher = useFetcher()
  const deleteFetcher = useFetcher()
  const reindexFetcher = useFetcher()
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(data.scenes[0])
  const [relinkModalOpen, setRelinkModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [reindexModalOpen, setReindexModalOpen] = useState(false)
  const [relinkSuccess, setRelinkSuccess] = useState(false)

  const isReindexing = reindexFetcher.state === 'submitting' || data.processingJobsCount > 0

  const onRelink = (oldSource: string, newSource: string) => {
    relinkFetcher.submit({ oldSource, newSource, intent: 'relink-video' }, { method: 'post' })
  }

  const onDelete = (source: string) => {
    deleteFetcher.submit({ source, intent: 'delete-video' }, { method: 'post' })
  }

  const onReindex = (source: string) => {
    reindexFetcher.submit({ source, intent: 'reindex-video' }, { method: 'post' })
  }

  const handleSceneClick = (scene: typeof activeScene) => {
    setActiveScene(scene)
    setDefaultStartTime(scene.startTime + 0.1)
  }

  useEffect(() => {
    if (searchParams.has('startTime')) {
      setDefaultStartTime(parseInt(searchParams.get('startTime') || '0'))
    }
  }, [searchParams])

  useEffect(() => {
    if (relinkFetcher.data) {
      if ('redirectLink' in relinkFetcher.data) {
        setRelinkModalOpen(false)
        setRelinkSuccess(true)
        navigate(relinkFetcher.data.redirectLink)
      } else if ('error' in relinkFetcher.data) {
        setRelinkSuccess(false)
        alert(relinkFetcher.data.error)
      }
    }
  }, [navigate, relinkFetcher.data])

  useEffect(() => {
    if (deleteFetcher.data) {
      if (deleteFetcher.data.success) {
        setDeleteModalOpen(false)
        navigate('/app/home')
      } else if (deleteFetcher.data.error) {
        alert(deleteFetcher.data.error)
      }
    }
  }, [deleteFetcher.data, navigate])

  useEffect(() => {
    if (reindexFetcher.data) {
      if (reindexFetcher.data.success) {
        setReindexModalOpen(false)
      } else if (reindexFetcher.data.error) {
        alert(reindexFetcher.data.error)
      }
    }
  }, [reindexFetcher.data])

  useEffect(() => {
    const time = Math.round(currentTime * 100) / 100
    const scene = data.scenes.find((scene) => time >= scene.startTime && time <= scene.endTime)
    if (scene) {
      setActiveScene(scene)
    }
  }, [currentTime, data.scenes])

  useKeyboardNavigation({
    activeScene,
    scenes: data.scenes,
    onSceneChange: (scene) => {
      setActiveScene(scene)
      setDefaultStartTime(scene.startTime)
    },
  })

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <VideoHeader
          fileName={data.source.split('/').pop() || ''}
          sceneCount={data.scenes.length}
          collections={data.collections}
          projects={data.projects}
          videoSource={data.source}
          onReindex={() => setReindexModalOpen(true)}
          onDelete={() => setDeleteModalOpen(true)}
          importAt={data.importAt}
          disabled={data.processingJobsCount > 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <DeleteVideo
              isOpen={deleteModalOpen}
              source={data.source}
              onClose={() => setDeleteModalOpen(false)}
              onDelete={onDelete}
            />
            <ReindexVideo
              isOpen={reindexModalOpen}
              source={data.source}
              onClose={() => setReindexModalOpen(false)}
              onReindex={onReindex}
              isReindexing={isReindexing}
            />

            <RelinkVideo
              isOpen={relinkModalOpen}
              oldSource={data.source}
              onClose={() => setRelinkModalOpen(false)}
              onRelink={onRelink}
              relinkSuccess={relinkSuccess}
            />

            {data.processingJobsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  We have processing video job for this video, the details of this video will be updated once all jobs
                  is completed
                </span>
              </div>
            )}
            {data.videoExist ? (
              <CustomVideoPlayer
                source={'/media?source=' + encodeURIComponent(data.source)}
                scenes={data.scenes}
                title={data.source}
                defaultStartTime={defaultStartTime}
                onTimeUpdate={setCurrentTime}
              />
            ) : (
              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/20 rounded-xl flex items-center justify-between">
                <span className="text-sm text-amber-900 dark:text-amber-100">
                  Video file is missing. Please relink.
                </span>
                <button
                  onClick={() => setRelinkModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
                >
                  Relink
                </button>
              </div>
            )}

            {activeScene && <ActiveSceneCard scene={activeScene} />}

            {data.job && <ProcessingJobDetails job={data.job} processingRatio={data.processingRatio} />}
          </div>

          <ScenesSidebar scenes={data.scenes} activeScene={activeScene} onSceneClick={handleSceneClick} />
        </div>
      </main>
    </DashboardLayout>
  )
}
