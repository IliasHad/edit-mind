import { Queue, QueueOptions } from 'bullmq'
import { connection } from '../src/services/redis'

const createQueue = (name: string, customOptions?: Partial<QueueOptions>): Queue => {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000 * 60 * 2,
      },
      removeOnComplete: {
        age: 86400,
        count: 100,
      },
      removeOnFail: {
        age: 604800,
      },
    },
    ...customOptions,
  })
}

export const immichImporterQueue = createQueue('immich-importer', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

export const videoStitcherQueue = createQueue('video-stitcher', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

export const faceLabellingQueue = createQueue('face-labelling')
export const faceRenameQueue = createQueue('face-renaming')

export const faceDeletionQueue = createQueue('face-deletion', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const smartCollectionQueue = createQueue('smart-collection')

export const chatQueue = createQueue('chat-message', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})

export const exportQueue = createQueue('export-scenes', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

export const transcriptionQueue = createQueue('transcription', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 10, // 10 minutes delay
    },
  },
})

export const frameAnalysisQueue = createQueue('frame-analysis', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 10, // 10 minutes delay
    },
  },
})

export const sceneCreationQueue = createQueue('scene-creation', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 5,
    },
  },
})

export const textEmbeddingQueue = createQueue('text-embedding', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 5,
    },
  },
})

export const visualEmbeddingQueue = createQueue('visual-embedding', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 5,
    },
  },
})

export const audioEmbeddingQueue = createQueue('audio-embedding', {
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 5,
    },
  },
})

export const videoFinalizationQueue = createQueue('video-finalization', {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
})
