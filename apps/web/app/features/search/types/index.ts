export interface SearchFilters {
  face?: string[]
  object?: string[]
  emotion?: string[]
  camera?: string[]
  shotType?: string[]
  transcription?: string
  text?: string
  location?: string[]
}
export type SearchFiltersType = keyof SearchFilters
