interface BoundingBox {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

interface Appearance {
  frame_index: number
  timestamp_ms: number
  timestamp_seconds: number
  formatted_timestamp: string
  bounding_box: BoundingBox
  padded_bounding_box: BoundingBox
}

export interface UnknownFace {
  face_id: string
  job_id: string

  image_file: string
  json_file: string
  image_hash: string

  created_at: string
  last_updated: string

  video_path: string
  video_name: string

  all_appearances: Appearance[]
  total_appearances: number
  last_appearance: Appearance
}
