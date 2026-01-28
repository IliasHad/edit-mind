import { logger } from '@shared/services/logger'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { saveImmichIntegration, deleteImmichIntegration, getImmichConfig } from '~/services/immich.server';
import { ImmichConfigFormSchema } from '@immich/schemas/immich'
import { requireUser, requireUserId } from '~/services/user.sever'
import { backgroundJobsFetch } from '~/services/background.server'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request)

    const config = await getImmichConfig(userId)

    return {
      config: {
        baseUrl: config?.baseUrl,
        id: config?.id,
      },
    }
  } catch (error) {
    logger.error({ error }, 'Error fetching Immich config:')
    return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), {
      status: 500,
    })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request)

  const method = request.method

  try {
    switch (method) {
      case 'POST': {
        const body = await request.json()
        const result = ImmichConfigFormSchema.safeParse(body)

        if (!result.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid configuration', fieldErrors: result.error.flatten().fieldErrors }),
            {
              status: 400,
            }
          )
        }

        const integration = await saveImmichIntegration(user.id, result.data.apiKey, result.data.baseUrl)

        await backgroundJobsFetch('/internal/immich/import', { integrationId: integration.id }, user)

        return { integration }
      }

      case 'PUT': {
        const body = await request.json()
        const result = ImmichConfigFormSchema.safeParse(body)

        if (!result.success) {
          logger.error(result.error)
          return new Response(
            JSON.stringify({ error: 'Invalid configuration', fieldErrors: result.error.flatten().fieldErrors }),
            {
              status: 400,
            }
          )
        }

        const integration = await saveImmichIntegration(user.id, result.data.apiKey, result.data.baseUrl)

        return { integration }
      }

      case 'DELETE': {
        await deleteImmichIntegration(user.id)
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
        })
    }
  } catch (error) {
    logger.error({ error }, 'Error handling Immich integration:')

    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
    })
  }
}
