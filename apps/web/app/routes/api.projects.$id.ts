import { ProjectModel } from '@db/index'
import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { ProjectUpdateSchema } from '~/features/projects/schemas'
import { requireUserId } from '~/services/user.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)
    const { id } = params
    const project = await ProjectModel.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        instructions: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        videos: {
          select: {
            id: true,
            name: true,
            source: true,
          },
        },
      },
    })

    return {
      project,
    }
  } catch (error) {
    logger.error('Error fetching project details: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch project details' }), { status: 500 })
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { id } = params

    if (request.method === 'DELETE' && id) {
      await ProjectModel.delete(id)
      return new Response(JSON.stringify({ message: 'Project is deleted' }), { status: 200 })
    }

    if (request.method !== 'PUT') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 400 })
    }

    const payload = await request.json()

    const form = ProjectUpdateSchema.safeParse(payload)

    if (!form.success || !id) {
      return new Response(JSON.stringify({ error: 'Failed to update your project' }), { status: 400 })
    }

    const { name, videoIds, instructions } = form.data
    const project = await ProjectModel.update(id, {
      name,
      videoIds,
      instructions,
    })

    return {
      project,
    }
  } catch (error) {
    logger.error('Error updating your project: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to update your project' }), { status: 500 })
  }
}
