import goproTelemetry from 'gopro-telemetry'
import gpmfExtract from 'gpmf-extract'
import { readFileSync } from 'node:fs'
import { GoProMetadata, GoProMetadataWithStreams, GPS5Sample } from '../types/gopro'
import { logger } from '@shared/services/logger'

export async function getGoProVideoMetadata(videoFullPath: string): Promise<GoProMetadata | null> {
  return new Promise((res, _rej) => {
    try {
      const file = readFileSync(videoFullPath)
      gpmfExtract(file)
        .then((extracted) => {
          try {
            goproTelemetry(extracted, {}, (telemetry: GoProMetadata) => {
              res(telemetry)
            })
          } catch (err) {
            logger.error(`Failed to extract GPMF from ${videoFullPath} ${err}`)
            res(null)
          }
        })
        .catch((err: Error) => {
          logger.error(`Failed to extract GPMF from ${videoFullPath} ${err}`)
          res(null)
        })
    } catch {
      res(null)
    }
  })
}

export function getGoProDeviceName(metadata: GoProMetadata): string {
  for (const key in metadata) {
    const value = metadata[key as keyof GoProMetadata]
    if (
      value &&
      typeof value === 'object' &&
      'device name' in value &&
      typeof (value as GoProMetadata)['device name'] === 'string'
    ) {
      return (value as GoProMetadata)['device name'] as string
    }
  }
  return 'Unknown GoPro Device'
}

export function extractGPS(metadata: GoProMetadataWithStreams ): { lat: number; lon: number; alt?: number }[] {
  const gpsData: { lat: number; lon: number; alt?: number }[] = []

  
  if (metadata.streams?.GPS5) {
    const gps5 = metadata.streams.GPS5

    gps5.samples.slice(0, 5).forEach((sample: GPS5Sample) => {
      if (Array.isArray(sample.value)) {
        const [lat, lon, alt] = sample.value
        gpsData.push({ lat, lon, alt })
      }
    })
  }

  return gpsData
}
