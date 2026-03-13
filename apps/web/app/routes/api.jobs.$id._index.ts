import { JobModel } from '@db/index'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs } from 'react-router'

export async function loader({ params }: ActionFunctionArgs) {
  try {
    const { id } = params

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "ID is required" }), { status: 400 })
    }

    const job = await JobModel.findById(id)

    return new Response(JSON.stringify({ success: true, job }), { status: 200 })
  } catch (error) {
    logger.error('Failed to retry failed job: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to retry failed job' }), { status: 500 })
  }
}
