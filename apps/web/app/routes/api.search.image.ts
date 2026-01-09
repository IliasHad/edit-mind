import type { ActionFunctionArgs } from 'react-router'
import { searchByImage } from '@search/services/visualSearch'
import { logger } from '@shared/services/logger'
import { type FileUpload, parseFormData } from '@remix-run/form-data-parser'
import { fileStorage } from '~/services/image.server'
import { buildSearchQueryFromSuggestions } from '@search/services/suggestion'
import { searchScenes } from '@search/services'
import { combineResults } from '@search/services/hybridSearch'

export async function action({ request }: ActionFunctionArgs) {
  async function uploadHandler(fileUpload: FileUpload) {
    if (fileUpload.fieldName === 'image') {
      const url = new URL(request.url)
      const fileName = url.searchParams.get('fileName')
      if (fileName) {
        // FileUpload objects are not meant to stick around for very long (they are
        // streaming data from the request.body); store them as soon as possible.
        await fileStorage.set(fileName, fileUpload)

        // Return a File for the FormData object. This is a LazyFile that knows how
        // to access the file's content if needed (using e.g. file.stream()) but
        // waits until it is requested to actually read anything.
        return fileStorage.get(fileName)
      } else {
        throw new Error('No file name provided')
      }
    }
  }

  const oneKb = 1024
  const oneMb = 1024 * oneKb
  const formData = await parseFormData(
    request,
    {
      maxFileSize: 10 * oneMb,
    },
    uploadHandler
  )

  const url = new URL(request.url)

  const fileName = url.searchParams.get('fileName')

  if (!fileName) {
    return new Response(JSON.stringify({ error: 'No file name provided' }), { status: 500 })
  }

  const image = await fileStorage.get(fileName)
  if (!image) {
    return new Response(JSON.stringify({ error: 'No image provided' }), { status: 500 })
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = parseInt(url.searchParams.get('limit') || '40', 10)
  const offset = (page - 1) * limit

  try {
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const face = formData.get('face')?.toString() || ''
    const object = formData.get('object')?.toString() || ''
    const emotion = formData.get('emotion')?.toString() || ''
    const shotType = formData.get('shotType')?.toString() || ''
    const camera = formData.get('camera')?.toString() || ''
    const transcription = formData.get('transcription')?.toString() || ''
    const text = formData.get('text')?.toString() || ''
    const query = formData.get('query')?.toString() || ''
    const locations = formData.get('location')?.toString() || ''

    const searchParams = buildSearchQueryFromSuggestions({
      face,
      object,
      emotion,
      shotType,
      camera,
      transcription,
      text,
      semanticQuery: query,
      locations,
    })

    const [imageResults, textResults] = await Promise.all([
      searchByImage(buffer, undefined).catch((error) => {
        logger.error('Image search failed: ' + error)
        return []
      }),
      searchScenes(searchParams, undefined).catch((error) => {
        logger.error('Text search failed: ' + error)
        return []
      }),
    ])

    const combinedResults = combineResults(imageResults, textResults, {
      imageWeight: 0.7,
      textWeight: 0.3,
      hasQuery: !!query,
    })
    const paginatedVideos = combinedResults.slice(offset, offset + limit)

    return {
      videos: paginatedVideos,
      total: combinedResults.length,
      page,
      limit,
    }
  } catch (error) {
    logger.error('Error in image search: ' + error)
    return new Response(JSON.stringify({ error: 'Image search failed' }), { status: 500 })
  }
}
