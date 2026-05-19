import { z } from 'zod'
import { translate } from '~/i18n/translate'

export const ProjectCreateSchema = z.object({
  name: z.string().min(1, translate('projects.validation.nameRequired')).max(100, translate('projects.validation.nameMax')),
  instructions: z.string().max(5000, translate('projects.validation.instructionsMax')),
  videoIds: z.array(z.string()).min(1, translate('projects.validation.videoRequired')),
})

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1, translate('projects.validation.nameRequired')).max(100, translate('projects.validation.nameMax')),
  instructions: z.string().max(5000, translate('projects.validation.instructionsMax')),
  videoIds: z.array(z.string()).min(1, translate('projects.validation.videoRequired')),
})

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>
