const jobs = {
  meta: {
    title: 'Jobs | Edit Mind',
  },
  title: 'AI Jobs',
  jobCount_one: '{{count}} Job',
  jobCount_other: '{{count}} Jobs',
  retrying: 'Retrying…',
  retryFailed: 'Retry Failed Jobs',
  queue: 'Processing Queue',
  empty: {
    title: 'No Active Jobs',
    description: 'Video indexing jobs will appear here when you add new videos.',
    folderDescription: 'Video indexing jobs will appear here when you add new videos to this folder.',
  },
  status: {
    done: 'Done',
    error: 'Error',
    pending: 'Pending',
    processing: 'Processing',
    cancelled: 'Cancelled',
    irrecoverable: 'Unsupported',
  },
  stage: {
    transcoding: 'Transcoding',
    starting: 'Starting',
    transcribing: 'Transcribing Audio',
    frame_analysis: 'Analyzing Frames',
    creating_scenes: 'Creating Scenes',
    embedding_text: 'Embedding Text',
    embedding_visual: 'Embedding Visuals',
    embedding_audio: 'Embedding Audio',
  },
  actions: {
    retry: 'Retry',
    retryJob: 'Retry job',
    cancel: 'Cancel',
    cancelJob: 'Cancel job',
  },
  details: {
    cannotProcess: 'Cannot be processed',
    transcoding: 'Transcoding: {{duration}}',
    transcription: 'Transcription: {{duration}}',
    frameAnalysis: 'Frame Analysis: {{duration}}',
    sceneCreation: 'Scene Creation: {{duration}}',
    textEmbedding: 'Text Embedding: {{duration}}',
    visualEmbedding: 'Visual Embedding: {{duration}}',
    audioEmbedding: 'Audio Embedding: {{duration}}',
  },
} as const

export default jobs
