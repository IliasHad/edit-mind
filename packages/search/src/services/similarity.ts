import { Scene } from "@shared/schemas"
import { logger } from "@shared/services/logger"
import { createVectorDbClient } from "@vector/services/client"
import { metadataToScene } from "@vector/utils/shared"

export async function getSimilarScenes(
  referenceSceneIds: string[],
  nResults: number = 30,
  projectVideoSources?: string[]
): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()
    if (!collection) throw new Error('Collection not initialized')

    const referenceScene = await collection.get({
      ids: referenceSceneIds,
      include: ['metadatas', 'embeddings'],
    })

    if (!referenceScene.embeddings?.[0]) {
      throw new Error('Reference scene not found')
    }

    const referenceEmbedding = referenceScene.embeddings[0]

    // Build where clause for project filtering
    const whereClause =
      projectVideoSources && projectVideoSources.length > 0 ? { source: { $in: projectVideoSources } } : undefined

    const vectorQuery = await collection.query({
      queryEmbeddings: [referenceEmbedding],
      nResults: nResults + referenceSceneIds.length,
      where: whereClause, // Add the where clause here
      include: ['metadatas', 'distances'],
    })

    if (!vectorQuery.metadatas[0] || !vectorQuery.ids[0]) {
      return []
    }

    const scenes: Scene[] = []
    for (let i = 0; i < vectorQuery.metadatas[0].length; i++) {
      const id = vectorQuery.ids[0][i]

      // Skip the reference scene itself
      if (referenceSceneIds.includes(id)) continue // Fixed: was !referenceSceneIds.includes(id)

      const metadata = vectorQuery.metadatas[0][i]
      if (!metadata) continue

      scenes.push(metadataToScene(metadata, id))
    }

    return scenes.slice(0, nResults)
  } catch (error) {
    logger.error('Error in similarity search: ' + error)
    throw error
  }
}
