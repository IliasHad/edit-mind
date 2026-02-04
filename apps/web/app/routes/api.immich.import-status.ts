import type { LoaderFunctionArgs } from 'react-router'
import { getImmichConfig, getImportStatus } from '~/services/immich.server'
import { requireUser } from '~/services/user.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request)
  const config = await getImmichConfig(user.id)
  let timeout: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    cancel() {
      if (timeout) clearTimeout(timeout)
    },
    async start(controller) {
      const encoder = new TextEncoder()

      const sendUpdate = async () => {
        try {
          if (!config || !config.id) {
            controller.close()
            return
          }

          if (config && config.id) {
            const status = await getImportStatus(user, config?.id)

            const data = `data: ${JSON.stringify(status)}\n\n`
            controller.enqueue(encoder.encode(data))

            if (status.status === 'completed' || status.status === 'failed') {
              controller.close()
              return
            }

            timeout = setTimeout(sendUpdate, 1000)
          }
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
