export interface GoProMetadata {
  [key: number]: unknown
  1: GoProMetadataWithStreams | unknown
  'device name'?: unknown
}
export interface GPS5Sample {
  value: [number, number, number] // [lat, lon, alt]
  cts: number
  date: string
}

export interface GPS5Stream {
  samples: GPS5Sample[]
  name: string
}

export interface GoProStreams {
  GPS5?: GPS5Stream
  [key: string]: GPS5Stream | undefined
}

export interface GoProMetadataWithStreams extends GoProMetadata {
  streams?: GoProStreams
}
