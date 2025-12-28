export interface FFprobeStream {
  codec_type: string
  codec_name?: string
  width?: number
  height?: number
  r_frame_rate?: string
  avg_frame_rate?: string
  display_aspect_ratio?: string
  tags?: {
    rotate?: string | number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface FFprobeFormat {
  duration?: string | number
  size?: string
  bit_rate?: string
  tags?: {
    rotate?: string | number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface FFprobeMetadata {
  streams: FFprobeStream[]
  format: FFprobeFormat
}
