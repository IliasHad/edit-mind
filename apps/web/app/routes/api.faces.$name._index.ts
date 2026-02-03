import { type ActionFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.server'
import { logger } from '@shared/services/logger'
import { FaceRenameSchema, FaceDeleteSchema } from '~/features/faces/schemas'
import { backgroundJobsFetch } from '~/services/background.server'

export async function action({ request, params }: ActionFunctionArgs) {
  const { name } = params
  try {
    const user = await getUser(request)

    if (!user) throw new Error('User not authorized')

    const payload = await request.json()
    if (request.method === 'DELETE') {
      const form = FaceDeleteSchema.safeParse(payload)
      if (!form.success) {
        return new Response('Failed to rename your face', { status: 400 })
      }
      const { imageFile, jsonFile } = form.data

      await backgroundJobsFetch('/internal/faces', { imageFile, jsonFile }, user, 'DELETE')
      return new Response(JSON.stringify({ message: `Face ${imageFile} has been sent for deletion` }), {
        status: 200,
      })
    }

    if (request.method === 'PATCH') {
      const form = FaceRenameSchema.safeParse(payload)
      if (!form.success) {
        return new Response('Failed to rename your face', { status: 500 })
      }
      const { newName } = form.data
      await backgroundJobsFetch(`/internal/faces/${name}/rename`, { newName }, user, 'POST')
      return new Response(
        JSON.stringify({ message: `Face ${name} has been sent for renaming to ${newName}`, success: true }),
        {
          status: 200,
        }
      )
    }
    return new Response('Method not authorized', { status: 400 })
  } catch (error) {
    logger.error({ error }, 'Error processing face')
    return new Response('Failed to process face', { status: 500 })
  }
}
