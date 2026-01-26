import type { LoaderFunctionArgs } from 'react-router'
import { getImmichConfig, getImportStatus } from '~/services/immich.server'
import { requireUser } from '~/services/user.sever';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request)
  const config = await getImmichConfig(user.id)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendUpdate = async () => {
        try {
          const status = await getImportStatus(user, config?.id)

          const data = `data: ${JSON.stringify(status)}\n\n`
          controller.enqueue(encoder.encode(data))

          if (status.status === 'completed' || status.status === 'failed') {
            controller.close()
            return
          }

          setTimeout(sendUpdate, 1000)
        } catch (error) {
          console.error('Error sending import status:', error)
          controller.error(error)
        }
      }

      await sendUpdate()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
