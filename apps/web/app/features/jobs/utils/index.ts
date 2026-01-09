import type { Job } from "@prisma/client"

export const getStageLabel = (stage: Job['stage']) => {
    switch (stage) {
        case 'starting':
            return 'Starting'
        case 'transcribing':
            return 'Transcribing Audio'
        case 'frame_analysis':
            return 'Analyzing Frames'
        case 'creating_scenes':
            return 'Creating Scenes'
        case 'embedding_text':
            return 'Embedding Text'
        case 'embedding_visual':
            return 'Embedding Visuals'
        case 'embedding_audio':
            return 'Embedding Audio'
        default:
            return stage
    }
}

export const getStatusColor = (status: Job['status']) => {
    switch (status) {
        case 'done':
            return 'bg-green-500/10 text-green-500 border-green-500/20'
        case 'error':
            return 'bg-red-500/10 text-red-500 border-red-500/20'
        case 'pending':
            return 'bg-white/5 text-white/60 border-white/10'
        case 'processing':
            return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        default:
            return 'bg-white/5 text-white/60 border-white/10'
    }
}