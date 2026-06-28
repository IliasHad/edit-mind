import { JobModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '~/services/user.server'

export async function loader({ params }: LoaderFunctionArgs) {
  try {
    const { id } = params

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "ID is required" }), { status: 400 })
    }

    const job = await JobModel.findById(id)

    return new Response(JSON.stringify({ success: true, job }), { status: 200 })
  } catch (error) {
    logger.error('Failed to fetch job: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to fetch job' }), { status: 500 })
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { id } = params

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 })
    }

    await requireUserId(request)
    await JobModel.delete(id)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    logger.error('Failed to delete job: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to delete job' }), { status: 500 })
  }
}
