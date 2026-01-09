import { type ActionFunctionArgs } from 'react-router'
import { getUser } from '~/services/user.sever'
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
        return new Response('Failed to rename your face', { status: 500 })
      }
      const { imageFile, jsonFile } = form.data

      await backgroundJobsFetch('/face', { imageFile, jsonFile }, user, 'DELETE')
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
      logger.debug(newName)
      await backgroundJobsFetch(`/face/${name}/rename`, { newName }, user, 'POST')
      return new Response(
        JSON.stringify({ message: `Face ${name} has been sent for renaming to ${newName}`, success: true }),
        {
          status: 200,
        }
      )
    }
    return new Response('Method not authorized', { status: 400 })

  } catch (error) {
    logger.error('Error processing face')
    logger.error(error)
    return { success: false, error: 'Failed to process face' }
  }
}
