import { z } from 'zod'

export const FaceRenameSchema = z.object({
  newName: z.string(),
})

export const FaceDeleteSchema = z.object({
  imageFile: z.string(),
  jsonFile: z.string(),
})

export const FaceLabelSchema = z.object({
  name: z.string(),
  faces: z
    .array(
      z.object({
        faceId: z.string(),
        jsonFile: z.string(),
      })
    )
    .min(0),
})
