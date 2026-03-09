import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { logger } from '@shared/services/logger'
import { LabelObject, UpdateSceneData } from '@shared/types/video';
import { getScenesStreamBySource, updateVideoMetadata } from '@vector/services/db';
import { updateScenes } from '@embedding-core/utils/textEmbedding';
import { suggestionCache } from '@search/services/suggestion';

async function processVideo(job: Job<UpdateSceneData>) {
    const { source, metadata } = job.data

    try {
        const labels = Array.isArray(metadata)
            ? metadata.map(r => Object.entries(r).map(([name, value]) => ({ name, value }))).flat()
            : (metadata as { labels: LabelObject[] }).labels ?? []

        const updateFields = labels.reduce<Record<string, string>>((acc, label) => {
            acc[label.name] = label.value
            return acc
        }, {})


        await updateVideoMetadata(source, updateFields)

        const sceneMetadata = "labels" in metadata
            ? { labels: Object.keys(updateFields).length ? [updateFields] : [] }
            : updateFields


        for await (const scene of getScenesStreamBySource(source)) {
            await updateScenes([{ ...scene, ...sceneMetadata }], source)

        }
        await suggestionCache.refresh()

    } catch (error) {
        logger.error(
            { source, error, stack: error instanceof Error ? error.stack : undefined },
            'Error updating video metadata'
        )
        throw error
    }
}

export const updateVideoWorker = new Worker('update-video', processVideo, {
    connection,
    concurrency: 3,
    lockDuration: 60 * 1000,
    stalledInterval: 15 * 1000,
    maxStalledCount: 3,
    lockRenewTime: 30 * 1000,
})
