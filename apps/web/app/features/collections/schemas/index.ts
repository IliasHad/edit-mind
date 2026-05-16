import { z } from 'zod'
import { translate } from '~/i18n/translate'

export const CollectionExportSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, translate('collections.validation.sceneRequired')).default([]),
})
