import type { Metadata, QueryResult } from 'chromadb'
import type { Scene } from '@shared/types'
import { metadataToScene } from '@vector/utils/shared'

export function collectScenesFromQuery(
  vectorQuery: QueryResult<Metadata>,
  scenesIds: Set<string>,
  finalScenes: Scene[]
) {
  for (let i = 0; i < vectorQuery.metadatas.length; i++) {
    const metadatas = vectorQuery.metadatas[i] ?? []
    const ids = vectorQuery.ids[i] ?? []
    const documents = vectorQuery.documents[i] ?? []

    for (let j = 0; j < metadatas.length; j++) {
      const metadata = metadatas[j]
      const id = ids[j]
      const text = documents[j]

      if (!metadata || !id || !text) continue

      const scene = metadataToScene(metadata, id, text)
      if (scenesIds.has(scene.id)) continue
      scenesIds.add(scene.id)
      finalScenes.push(scene)
    }
  }
}
