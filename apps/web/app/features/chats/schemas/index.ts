import { z } from 'zod'
import { translate } from '~/i18n/translate'

export const ChatCreateSchema = z.object({
  prompt: z.string().min(1, translate('chats.validation.promptRequired')),
  projectId: z.string().nullable().default(null),
})

export const ChatMessageCreateSchema = z.object({
  prompt: z.string().min(1, translate('chats.validation.promptRequired')),
})

export const ChatMessageStitcherSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, translate('chats.validation.sceneRequired')).default([]),
})

export const ChatMessageExportSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, translate('chats.validation.sceneRequired')).default([]),
})
