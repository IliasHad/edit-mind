import { logger } from '@shared/services/logger'
import { audioEmbeddingWorker } from 'src/jobs/audioEmbedding'
import { chatWorker } from 'src/jobs/chat'
import { exportWorker } from 'src/jobs/export'
import { faceDeletionWorker } from 'src/jobs/faceDeletion'
import { faceLabellingWorker } from 'src/jobs/faceLabelling'
import { faceRenamingWorker } from 'src/jobs/faceRenaming'
import { frameAnalysisWorker } from 'src/jobs/frameAnalysis'
import { smartCollectionWorker } from 'src/jobs/smartCollection'
import { textEmbeddingWorker } from 'src/jobs/textEmbedding'
import { audioTranscriptionWorker } from 'src/jobs/transcription'
import { videoStitcherWorker } from 'src/jobs/videoStitcher'
import { visualEmbeddingWorker } from 'src/jobs/visualEmbedding'

export async function shutdownWorkers() {
    try {
        logger.debug('Shutting down workers...')
        await Promise.all([
            frameAnalysisWorker.close(),
            audioTranscriptionWorker.close(),
            audioEmbeddingWorker.close(),
            visualEmbeddingWorker.close(),
            textEmbeddingWorker.close(),
            faceDeletionWorker.close(),
            faceLabellingWorker.close(),
            faceRenamingWorker.close(),
            smartCollectionWorker.close(),
            exportWorker.close(),
            videoStitcherWorker.close(),
            chatWorker.close(),
        ])
    } catch (err) {
        logger.error('Shutdown error ' + err)
    } finally {
        process.exit(0)
    }
}
