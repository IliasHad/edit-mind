export interface Face {
  name: string
  location: [number, number, number, number]
  emotion: {
    label: string
    confidence: number
  }
  bbox: BBox
  confidence: number
}
export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectedObject {
  label: string
  confidence: number
  box: [number, number, number, number]
  bbox: BBox
}

export interface FrameAnalysis {
  timestamp_seconds: number
  objects: DetectedObject[]
  faces: Face[]
  detected_text?: DetectedText[]
  start_time_ms: number
  end_time_ms: number
  scene_description: string
  shot_type: string
  dominant_color?: {
    name: string
    hex: string
    percentage: number
    is_vibrant: boolean
    is_muted: boolean
  }
  description: string
  thumbnail_path:string
}

export interface DetectedText {
  text: string
  confidence: number
  bounding_box: [[number, number], [number, number], [number, number], [number, number]]
  bbox: BBox
}

export interface SceneAnalysis {
  environment: string
  total_frames: number
}

export interface DetectedActivity {
  activity: string
  confidence: number
  indicators: string[]
  primary_objects: string[]
}

export interface FaceRecognitionSummary {
  known_people_identified: string[]
  unknown_faces_detected: number
  total_faces_detected: number
  all_faces: {
    timestamp: number
    name: string
  }[]
  unknown_faces_timestamps: number[]
}

export interface AnalysisSummary {
  total_frames_analyzed: number
  total_analysis_time_seconds: number
  processing_time: number,
  memory_cleanups: number,
  peak_memory_mb: number
}
export interface PluginAnalysisSummary {
  plugin_name: string
  total_duration_seconds: number
  frames_processed: number
  avg_time_per_frame_ms: number
  min_time_ms: number
  max_time_ms: number
  timeout_count: number
  error_count: number
}

export interface Analysis {
  video_file: string
  scene_analysis: SceneAnalysis
  detected_activities: DetectedActivity[]
  face_recognition_summary: FaceRecognitionSummary
  frame_analysis: FrameAnalysis[]
  summary: AnalysisSummary
  plugin_performance: PluginAnalysisSummary[]
}

export interface AnalysisProgress {
  plugin: string
  progress: number
  message: string
  elapsed: string
  frames_analyzed: number
  total_frames: number
  job_id: string
}

export interface FrameAnalysisPluginAnalysis {
  name: string
  duration: number
  frameProcessed: number
}

interface Appearance {
  frame_index: number
  timestamp_ms: number
  timestamp_seconds: number
  formatted_timestamp: string
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
