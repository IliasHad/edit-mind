import type { Job } from '@prisma/client'
import { logger } from '@shared/services/logger'
import { type ActionFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.server'

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const user = await requireUser(request)

    const { id } = params

    const { job } = await backgroundJobsFetch<undefined, { job: Job }>(`/internal/jobs/${id}/cancel`, undefined, user, 'POST')
    return new Response(JSON.stringify({ success: true, job }), { status: 200 })

  } catch (error) {
    logger.error('Failed to retry failed job: ' + error)
    return new Response(JSON.stringify({ error: 'Failed to retry failed job' }), { status: 500 })
  }
}
