import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs } from 'react-router'
import { testImmichConnection } from '@immich/services/immich'
import { backgroundJobsFetch } from '~/services/background.server'
import { requireUser } from '~/services/user.sever'
import { getImmichConfig } from '~/services/immich.server'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    })
  }

  try {
    const user = await requireUser(request)

    const config = await getImmichConfig(user.id)

    const { validConnection, validPermissions } = await testImmichConnection(config)

    if (validConnection && validPermissions && config) {
      await backgroundJobsFetch('/internal/immich/import', { integrationId: config.id }, user)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connection successful! Your API key is valid.',
        }),
        {
          status: 200,
        }
      )
    } else if (validConnection && !validPermissions) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Connection failed. Please check your Immich API permissions.',
        }),
        {
          status: 200,
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Connection failed. Please check your API key and base URL.',
        }),
        {
          status: 200,
        }
      )
    }
  } catch (error) {
    logger.error('Error testing Immich connection:', error)

    return new Response(JSON.stringify({ error: 'Connection test failed', success: false }), {
      status: 400,
    })
  }
}
