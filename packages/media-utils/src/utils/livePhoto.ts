import { logger } from '@shared/services/logger'
import { validateFile } from '@shared/utils/file'
import { exiftool } from 'exiftool-vendored'

export async function checkForLivePhoto(videoFullPath: string): Promise<boolean> {
  try {
    await validateFile(videoFullPath)

    const tags = await exiftool.read(videoFullPath)

    if (tags.LivePhotoVideoIndex) {
      return true
    }
    return false
  } catch (error) {
    logger.error(`Error extracting Live Photo data:  ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}
