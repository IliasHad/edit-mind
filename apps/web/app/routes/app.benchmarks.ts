import { JobModel, VideoModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { requireUserId } from '~/services/user.server'
import os from 'os'
import type {
  BenchmarkResponse,
  FrameAnalysisPlugin,
  JobBenchmark,
  PluginStats,
  PluginUsage,
  ProcessingStats,
} from '~/features/benchmarks/types'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)

    const videos = await VideoModel.findMany({
      where: { userId },
      select: {
        id: true,
        source: true,
        name: true,
        duration: true,
      },
    })

    const allJobBenchmarks: JobBenchmark[] = []
    const pluginUsage = new Map<string, PluginUsage>()

    for (const video of videos) {
      const jobs = await JobModel.findMany({
        where: {
          videoPath: video.source,
          status: 'done',
        },
        orderBy: { createdAt: 'desc' },
      })

      for (const job of jobs) {
        const videoDuration = Number(video.duration)

        const stageTimings = {
          frameAnalysis: job.frameAnalysisTime || 0,
          sceneCreation: job.sceneCreationTime || 0,
          transcription: job.transcriptionTime || 0,
          textEmbedding: job.textEmbeddingTime || 0,
          audioEmbedding: job.audioEmbeddingTime || 0,
          visualEmbedding: job.visualEmbeddingTime || 0,
        }

        const totalProcessingTime = Object.values(stageTimings).reduce((sum, t) => sum + t, 0)

        let plugins: Array<PluginStats> = []
        let totalFrames = 0

        if (job.frameAnalysisPlugins && Array.isArray(job.frameAnalysisPlugins)) {
          const framePlugins = JSON.parse(JSON.stringify(job.frameAnalysisPlugins)) as FrameAnalysisPlugin[]
          totalFrames = framePlugins[0]?.frameProcessed || 0

          const pluginDurationSum = framePlugins.reduce((sum, p) => sum + p.duration, 0)

          plugins = framePlugins
            .map((plugin) => {
              const existing = pluginUsage.get(plugin.name) || {
                totalDuration: 0,
                totalFrames: 0,
                count: 0,
              }
              pluginUsage.set(plugin.name, {
                totalDuration: existing.totalDuration + plugin.duration,
                totalFrames: existing.totalFrames + plugin.frameProcessed,
                count: existing.count + 1,
              })

              return {
                name: plugin.name,
                duration: plugin.duration,
                frameProcessed: plugin.frameProcessed,
                averageTimePerFrame: plugin.frameProcessed > 0 ? plugin.duration / plugin.frameProcessed : 0,
                percentageOfTotal: pluginDurationSum > 0 ? (plugin.duration / pluginDurationSum) * 100 : 0,
              }
            })
            .sort((a, b) => b.duration - a.duration)
        }

        const jobBenchmark: JobBenchmark = {
          jobId: job.id,
          videoPath: job.videoPath,
          videoName: video.name,
          status: job.status,
          videoDuration,
          videoDurationFormatted: humanizeSeconds(videoDuration),
          totalProcessingTime,
          processingSpeedRatio: videoDuration > 0 ? totalProcessingTime / videoDuration : 0,
          totalFramesProcessed: totalFrames,
          averageTimePerFrame: totalFrames > 0 ? totalProcessingTime / totalFrames : 0,
          plugins,
          stages: stageTimings,
        }

        allJobBenchmarks.push(jobBenchmark)
      }
    }

    // 1. Sort jobs by processing speed ratio
    const sortedByRatio = [...allJobBenchmarks].sort((a, b) => a.processingSpeedRatio - b.processingSpeedRatio)

    // 2. Calculate statistics
    const processingTimes = allJobBenchmarks.map((j) => j.totalProcessingTime)
    const speedRatios = allJobBenchmarks.map((j) => j.processingSpeedRatio)
    const timesPerFrame = allJobBenchmarks.map((j) => j.averageTimePerFrame)

    const stats: ProcessingStats = {
      fastest: sortedByRatio[0] ?? null,
      median: sortedByRatio[Math.floor(sortedByRatio.length / 2)] ?? null,
      slowest: sortedByRatio[sortedByRatio.length - 1] || null,
      average: {
        processingTime:
          processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0,
        processingSpeedRatio: speedRatios.length > 0 ? speedRatios.reduce((a, b) => a + b, 0) / speedRatios.length : 0,
        timePerFrame: timesPerFrame.length > 0 ? timesPerFrame.reduce((a, b) => a + b, 0) / timesPerFrame.length : 0,
      },
    }

    // 3. Calculate plugin statistics
    const frameAnalysisPlugins = Array.from(pluginUsage.entries())
      .map(([name, stats]) => ({
        name,
        avgDuration: stats.totalDuration / stats.count,
        avgTimePerFrame: stats.totalFrames > 0 ? stats.totalDuration / stats.totalFrames : 0,
        totalUsage: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)

    const response: BenchmarkResponse = {
      totalJobs: allJobBenchmarks.length,
      stats,
      frameAnalysisPlugins,
      hostname: os.hostname(),
    }

    return Response.json(response)
  } catch (error) {
    logger.error({ error }, 'Error fetching benchmarks details')
    return Response.json(
      {
        error: 'Failed to fetch benchmarks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
