interface BoundingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface FrameDimensions {
  width: number;
  height: number;
}

interface Label {
  name: string | null;
  labeled_by: string | null;
  labeled_at: string | null;
  confidence: number | null;
  notes: string | null;
}

interface Appearance {
  frame_index: number;
  timestamp_ms: number;
  timestamp_seconds: number;
  formatted_timestamp: string;
  bounding_box: BoundingBox;
  padded_bounding_box: BoundingBox;
}

export interface FaceDetectionData {
  image_file: string;
  json_file: string;
  image_hash: string;
  created_at: string;
  video_path: string;
  video_name: string;
  frame_index: number;
  timestamp_ms: number;
  timestamp_seconds: number;
  formatted_timestamp: string;
  frame_dimensions: FrameDimensions;
  face_id: string;
  bounding_box: BoundingBox;
  padded_bounding_box: BoundingBox;
  first_appearance: Appearance;
  all_appearances: Appearance[];
  total_appearances: number;
  label: Label;
  last_updated: string;
  last_appearance: Appearance;
}