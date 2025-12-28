import { getAllKnownFaces } from '@shared/utils/faces'

export async function loader() {
  const faces = await getAllKnownFaces()
  return { faces }
}
