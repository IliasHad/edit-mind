import { ProjectModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { ProjectCreateSchema } from '~/features/projects/schemas'
import { requireUserId } from '~/services/user.sever'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)

    const projects = await ProjectModel.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        instructions: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { videos: true },
        },
      },
    })

    return {
      projects,
    }
  } catch (error) {
    logger.error('Error fetching projects: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), { status: 500 })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const userId = await requireUserId(request)

    const payload = await request.json()

    const form = ProjectCreateSchema.safeParse(payload)

    if (!form.success) {
      return new Response(JSON.stringify({ error: 'Failed to create a new project' }), { status: 400 })
    }

    const { name, videoIds, instructions } = form.data

    const project = await ProjectModel.create({
      name,
      videoIds,
      instructions,
      userId,
      isArchived: false,
    })

    return {
      project: {
        ...project,
        videos: project.videos.map((video) => ({ ...video, duration: parseInt(video.duration.toString()) })),
      },
    }
  } catch (error) {
    logger.error('Error fetching projects: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to create a new project' }), { status: 500 })
  }
}
