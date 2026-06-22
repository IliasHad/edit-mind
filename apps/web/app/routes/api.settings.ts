import { AppSettingsModel } from '@db/index'
import { isSupportedLanguage } from '@shared/types/language'
import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { requireAdmin, requireUser } from '~/services/user.server'

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    try {
      await requireUser(request)
    } catch {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const language = await AppSettingsModel.getLanguage()

    return json({ language })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch app settings')
    return json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'PATCH' && request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    try {
      await requireAdmin(request)
    } catch {
      return json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()
    const language = payload?.language

    if (!isSupportedLanguage(language)) {
      return json({ error: 'Unsupported language' }, { status: 400 })
    }

    const settings = await AppSettingsModel.updateLanguage(language)

    return json({ language: settings.language })
  } catch (error) {
    logger.error({ error }, 'Failed to update app settings')
    return json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
