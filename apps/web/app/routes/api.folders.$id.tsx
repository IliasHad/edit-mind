import { prisma } from '~/services/database'
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) return { success: false, error: 'No folder id provided' }

  try {
    const folder = await prisma.folder.findUnique({
      where: { id },
    })
    if (!folder) return { success: false, error: 'Folder not found' }

    return { success: true, folder }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to load folder' }
  }
}
