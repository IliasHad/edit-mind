import type { LoaderFunctionArgs } from 'react-router'
import { prisma } from '~/services/database'
import { createReadStream, statSync } from 'fs'
import { logger } from '@shared/services/logger'
import path from 'path'
import { requireUser } from '~/services/user.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params

  if (!id) {
    throw new Response('Export ID is required', { status: 400 })
  }

  try {
    await requireUser(request)
    const exportRecord = await prisma.export.findFirst({
      where: {
        id,
      },
    })

    if (!exportRecord || !exportRecord.filePath) {
      throw new Response('Not Found', { status: 404 })
    }

    const stat = statSync(exportRecord.filePath)
    const stream = createReadStream(exportRecord.filePath)
    const fileName = path.basename(exportRecord.filePath)

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/zip',
        'Content-Length': stat.size.toString(),
      },
    })
  } catch (error) {
    logger.error(error)
    return new Response(JSON.stringify({ error: 'Error getting your export zip file' }), { status: 500 })
  }
}
