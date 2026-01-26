import type { ActionFunctionArgs } from 'react-router'
import { testImmichConnection } from '@immich/services/immich'
import { ImmichConfigFormSchema } from '@immich/schemas/immich'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
      }),
      {
        status: 405,
      }
    )
  }

  try {
    const body = await request.json()
    const result = ImmichConfigFormSchema.safeParse(body)

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid configuration',
          fieldErrors: result.error.flatten().fieldErrors,
          message: 'Missing Immich configuration',
        }),
        {
          status: 400,
        }
      )
    }

    const { validConnection, validPermissions } = await testImmichConnection(result.data)

    if (validConnection && validPermissions) {
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      }),
      {
        status: 500,
      }
    )
  }
}
