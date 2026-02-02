import { VideoSearchParams } from '@shared/types/search';
import { Where, WhereDocument } from 'chromadb';
export function applyFilters(
  query: VideoSearchParams,
  projectsVideSources?: string[]
): {
  where: Where | WhereDocument
  whereDocument: WhereDocument | undefined
} {
  const conditions: Where[] = []
  let whereDocument: WhereDocument | undefined = undefined
  const documentConditions: WhereDocument[] = []

  if (projectsVideSources && projectsVideSources.length > 0) {
    conditions.push({
      source: { $in: projectsVideSources },
    })
  }
  if (query.aspectRatio) {
    conditions.push({
      aspectRatio: { $in: Array.isArray(query.aspectRatio) ? query.aspectRatio : [query.aspectRatio] },
    })
  }

  if (query.locations.length > 0) {
    conditions.push({
      location: { $in: query.locations },
    })
  }
  if (query.camera) {
    conditions.push({
      camera: { $in: Array.isArray(query.camera) ? query.camera : [query.camera] },
    })
  }

  if (query.shotType) {
    conditions.push({ shotType: query.shotType })
  }

  if (query.faces?.length > 0) {
    conditions.push({
      faces: { $in: query.faces },
    })
  }

  if (query.objects?.length > 0) {
    conditions.push({
      objects: { $in: query.objects },
    })
  }

  if (query.emotions?.length > 0) {
    conditions.push({
      emotions: { $in: query.emotions },
    })
  }

  // Transcription search
  if (query.transcriptionRegex) {
    documentConditions.push({
      $regex: query.transcriptionRegex,
    })
  }

  if (query.transcriptionQuery) {
    for (const text of query.transcriptionQuery.split(',')) {
      documentConditions.push({
        $contains: text,
      })
    }
  }
  // Detected text search
  if (query.detectedTextRegex) {
    documentConditions.push({
      $regex: query.detectedTextRegex,
    })
  }

  if (query.detectedText) {
    for (const text of query.detectedText.split(',')) {
      documentConditions.push({
        $contains: text,
      })
    }
  }

  // Exclusion
  if (query.excludeTranscriptionRegex) {
    documentConditions.push({
      $not_regex: query.excludeTranscriptionRegex,
    })
  }

  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? { $and: conditions } : {}
  whereDocument =
    documentConditions.length === 0
      ? undefined
      : documentConditions.length === 1
        ? documentConditions[0]
        : { $and: documentConditions }

  return { where, whereDocument }
}
