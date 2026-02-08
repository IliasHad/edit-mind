import type { Metadata, QueryResult } from 'chromadb'
import type { Scene } from '@shared/schemas'
import { metadataToScene } from '@vector/utils/shared'

export function collectScenesFromQuery(
  vectorQuery: QueryResult<Metadata>,
  scenesIds: Set<string>,
  finalScenes: Scene[]
) {
  for (let i = 0; i < vectorQuery.metadatas.length; i++) {
    const metadata = vectorQuery.metadatas[i][0]
    const id = vectorQuery.ids[i][0]
    const text = vectorQuery.documents[i][0]

    if (!metadata || !id || !text) continue

    const scene = metadataToScene(metadata, id, text)
    if (scenesIds.has(scene.id)) return
    scenesIds.add(scene.id)
    finalScenes.push(scene)
  }
}
