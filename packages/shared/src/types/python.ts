import { Analysis, AnalysisProgress } from "./analysis";
import { FaceIndexingProgress, FaceMatchingProgress, FindMatchingFacesResponse } from "./face";
import { TranscriptionProgress } from "./transcription";

export type PythonMessage =
  | { type: 'analysis_progress'; payload: AnalysisProgress }
  | { type: 'analysis_completed'; payload: Analysis }
  | { type: 'analysis_error'; payload: Error }
  | { type: 'transcription_progress'; payload: TranscriptionProgress }
  | { type: 'transcription_completed'; payload: void }
  | { type: 'transcription_error'; payload: Error }
  | { type: 'reindex_progress'; payload: FaceIndexingProgress }
  | { type: 'reindex_complete'; payload: void }
  | { type: 'reindex_error'; payload: Error }
  | { type: 'face_matching_progress'; payload: FaceMatchingProgress }
  | { type: 'face_matching_complete'; payload: FindMatchingFacesResponse }
  | { type: 'face_matching_error'; payload: Error }

export type CallbackMap = {
  [K in PythonMessage['type']]?: (payload: Extract<PythonMessage, { type: K }>['payload']) => void
}
export enum PythonMessageType {
  // Analysis
  ANALYSIS_PROGRESS = 'analysis_progress',
  ANALYSIS_COMPLETED = 'analysis_completed',
  ANALYSIS_ERROR = 'analysis_error',

  // Transcription
  TRANSCRIPTION_PROGRESS = 'transcription_progress',
  TRANSCRIPTION_COMPLETED = 'transcription_completed',
  TRANSCRIPTION_ERROR = 'transcription_error',

  // Face Reindexing
  REINDEX_PROGRESS = 'reindex_progress',
  REINDEX_COMPLETED = 'reindex_complete',
  REINDEX_ERROR = 'reindex_error',

  // Face Matching
  FACE_MATCHING_PROGRESS = 'face_matching_progress',
  FACE_MATCHING_COMPLETED = 'face_matching_complete',
  FACE_MATCHING_ERROR = 'face_matching_error',
}
