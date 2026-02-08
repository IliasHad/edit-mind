export interface ThumbnailRequest {
  startTime: number
  endTime: number
  outputPath: string
}

export interface BatchThumbnailOptions {
  quality?: string
  scale?: string
  useGPU?: boolean
}
