import { z } from 'zod'

export const FaceRenameSchema = z.object({
  newName: z.string(),
})

export const FaceDeleteSchema = z.object({
  imageFile: z.string(),
  jsonFile: z.string()
})
