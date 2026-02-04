import { FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import type { ActionFunctionArgs } from 'react-router'
import { FaceLabelSchema } from '~/features/faces/schemas'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }
  const user = await requireUser(request)

  const payload = await request.json()

  const { data, success, error } = FaceLabelSchema.safeParse(payload)

  if (!success) {
    logger.error(error)
    return new Response('Failed to label faces', { status: 400 })
  }

  const { faces, name } = data

  try {
    const personDir = path.join(FACES_DIR, name)

    if (!existsSync(personDir)) {
      await mkdir(personDir, { recursive: true })
    }

    await backgroundJobsFetch('/internal/faces', { faces, name }, user, 'PATCH')

    return { success: true }
  } catch (error) {
    logger.error(error)
    return new Response('Error adding face labeling job', { status: 500 })
  }
}
