import { getAllUnknownFaces } from '@shared/utils/faces';
import type { LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '40', 10)
  
  const result = await getAllUnknownFaces(page, limit)
  return result
}