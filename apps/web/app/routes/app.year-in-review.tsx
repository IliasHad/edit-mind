import { useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { logger } from '@shared/services/logger'
import { YearInReviews } from '~/features/yearInReview/components'
import { getCache } from '@shared/services/cache'
import type { VideoWithScenes } from '@shared/types/video'
import type { YearInReviewData } from '@shared/schemas/yearInReview'
import { yearInReviewQueue } from '@background-jobs/src/queue'
import { getUser } from '~/services/user.sever'

export const meta: MetaFunction = () => {
  return [{ title: 'Year in Review | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const currentYear = new Date().getFullYear()

  try {
    const user = await getUser(request)
    if (!user) return { success: false, error: 'No user authenticated' }

    const cacheKey = `year:in:review:${currentYear}`

    const cached = await getCache<{
      videos: VideoWithScenes[]
      year: number
      data: YearInReviewData
      videoPath: string
    }>(cacheKey)
    if (cached) {
      return { ...cached, isProcessing: false }
    }

    const jobId = `year-in-review-${currentYear}-${user.id}`
    const existingJobs = await yearInReviewQueue.getJobs(['active', 'waiting', 'delayed'])
    const hasExistingJob = existingJobs.some((job) => job.id === jobId)

    if (!hasExistingJob) {
      await yearInReviewQueue.add(
        'year-in-review',
        {
          year: currentYear,
          userId: user.id,
        },
        {
          jobId,
          removeOnComplete: true,
          removeOnFail: false,
        }
      )
    }

    return {
      videos: [],
      year: currentYear,
      data: null,
      isProcessing: true,
      videoPath: null,
    }
  } catch (error) {
    logger.error('Failed to generate year in review: ' + error)
    return {
      videos: [],
      year: currentYear,
      data: null,
      isProcessing: false,
      error: 'Failed to generate year in review',
      videoPath: null,
    }
  }
}

export default function YearInReviewPage() {
  const { data, year, isProcessing, videoPath } = useLoaderData<typeof loader>()

  return (
    <DashboardLayout>
      {data ? (
        <YearInReviews data={data} year={year} videoPath={videoPath} />
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200" />
              <div
                className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500"
                style={{ animationDuration: '1s' }}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Creating Your {year} in Review
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                We're analyzing your videos to create something special
              </p>
            </div>

            {isProcessing && (
              <p className="mt-4 text-md text-gray-400 dark:text-gray-600">
                This page will automatically update when ready
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
