export interface FrameAnalysisPlugin {
  name: string
  duration: number
  frameProcessed: number
}

export interface JobBenchmark {
  jobId: string
  videoPath: string
  videoName: string
  status: string
  videoDuration: number
  videoDurationFormatted: string
  totalProcessingTime: number
  processingSpeedRatio: number
  totalFramesProcessed: number
  averageTimePerFrame: number
  plugins: Array<{
    name: string
    duration: number
    frameProcessed: number
    averageTimePerFrame: number
    percentageOfTotal: number
  }>
  stages: {
    frameAnalysis?: number
    sceneCreation?: number
    transcription?: number
    textEmbedding?: number
    audioEmbedding?: number
    visualEmbedding?: number
  }
}

export interface ProcessingStats {
  fastest: JobBenchmark | null
  median: JobBenchmark | null
  slowest: JobBenchmark | null
  average: {
    processingTime: number
    processingSpeedRatio: number
    timePerFrame: number
  }
}

export interface BenchmarkResponse {
  totalJobs: number
  stats: ProcessingStats
  frameAnalysisPlugins: Array<{
    name: string
    avgDuration: number
    avgTimePerFrame: number
    totalUsage: number
  }>
  hostname: string
}

export interface PluginStats {
  averageTimePerFrame: number
  frameProcessed: number
  name: string
  duration: number
  percentageOfTotal: number
}

export interface PluginUsage {
  totalDuration: number
  totalFrames: number
  count: number
}
