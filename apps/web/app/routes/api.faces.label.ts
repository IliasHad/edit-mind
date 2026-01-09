import { FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import type { ActionFunctionArgs } from 'react-router'
import { backgroundJobsFetch } from '~/services/background.server'
import { getUser } from '~/services/user.sever'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }
  const user = await getUser(request)

  const { faces, name } = await request.json()

  if (!faces?.length) return { success: false, error: 'No faces provided' }
  if (!name?.trim()) return { success: false, error: 'Name is required' }

  if (!user) throw new Error('User not authorized')

  try {
    const personDir = path.join(FACES_DIR, name)

    if (!existsSync(personDir)) {
      await mkdir(personDir, { recursive: true })
    }

    await backgroundJobsFetch('/face', { faces, name }, user, 'PATCH')

    return { success: true }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: 'Error adding face labeling job',
    }
  }
}
