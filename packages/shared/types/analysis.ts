export interface Face {
  name: string
  location: [number, number, number, number]
  emotion: {
    label: string,
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
}

export interface DetectedText {
  text: string
  confidence: number
  bounding_box: [[number, number], [number, number], [number, number], [number, number]]
  bbox: BBox
}

export interface SceneAnalysis {
  environment: string
  environment_confidence: number
  object_distribution: { [key: string]: number }
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
  primary_activity: string
  confidence: number
}

export interface Analysis {
  video_file: string
  scene_analysis: SceneAnalysis
  detected_activities: DetectedActivity[]
  face_recognition_summary: FaceRecognitionSummary
  frame_analysis: FrameAnalysis[]
  summary: AnalysisSummary
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
