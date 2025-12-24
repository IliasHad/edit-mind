import { FACES_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import type { ActionFunctionArgs } from 'react-router'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }

  const { faces, name } = await request.json()

  if (!faces?.length) return { success: false, error: 'No faces provided' }
  if (!name?.trim()) return { success: false, error: 'Name is required' }

  try {
    const personDir = path.join(FACES_DIR, name)
    if (!existsSync(personDir)) {
      await mkdir(personDir, { recursive: true })
    }
    const backgroundJobsUrl = process.env.BACKGROUND_JOBS_URL

    const res = await fetch(`${backgroundJobsUrl}/face/label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ faces, name }),
    })

    const data = await res.json()
    if (data.error) {
      throw new Error(data.error)
    }
    return { success: true }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: 'Error adding face labeling job',
    }
  }
}
