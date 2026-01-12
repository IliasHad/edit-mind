import { JobModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { UnknownFace } from '@shared/types/unknownFace'
import { getAllUnknownFaces } from '@shared/utils/faces'
import type { LoaderFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireUser(request)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '40', 10)

    const result = await getAllUnknownFaces()
    const faces = result.faces as UnknownFace[]

    // Fetch currently processing faces from the background jobs service (Queue)
    const processingFaces = await backgroundJobsFetch<
      undefined,
      { type: 'labelling' | 'deletion'; jsonFile: string }[]
    >('/internal/faces/processing', undefined, user, 'GET')

    const processingSet = new Set(processingFaces.map((f) => f.jsonFile))

    // 1. We need to filter out duplicate face with the same json_file
    // 2. Check if we have a processing job running for that video in the background jobs queue (check all video processing queues)
    // and push the face for the user to label only if the video is done with the processing, because in the face labelling queue,
    // we except the video saved over the vector (text, audio and visual) and over the postgres DB

    // After filtering for duplicates and processing faces
    const uniqueFaces = faces.filter((face) => face?.video_path && !processingSet.has(face.json_file))

    // Get unique job IDs
    const jobIds = [...new Set(uniqueFaces.map((f) => f.job_id))]

    // Single batch query
    const processedJobs = await JobModel.findMany({
      where: {
        id: { in: jobIds },
        status: 'done',
      },
    })

    const processedJobIds = new Set(processedJobs.map((j) => j.id))

    // Filter faces
    const filteredFaces: UnknownFace[] = []
    const facesJsonFiles = new Set<string>()

    for (const face of uniqueFaces) {
      if (processedJobIds.has(face.job_id) && !facesJsonFiles.has(face.json_file)) {
        filteredFaces.push(face)
        facesJsonFiles.add(face.json_file)
      }
    }

    const offset = (page - 1) * limit
    const totalPages = Math.ceil(filteredFaces.length / limit)
    const hasMore = page < totalPages

    return {
      total: filteredFaces.length,
      page,
      limit,
      faces: filteredFaces.slice(offset, limit),
      totalPages,
      hasMore,
    }
  } catch (error) {
    logger.error(error)
    return {
      faces: [],
      total: 0,
      page: 1,
      limit: 40,
      hasMore: false,
      totalPages: 1,
    }
  }
}
