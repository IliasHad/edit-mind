import { z } from 'zod'

export const FaceLabellingSchema = z.object({
  faces: z.array(z.object({ jsonFile: z.string(), faceId: z.string() })).min(1, 'At least one face is required'),
  name: z.string().min(1, 'Name cannot be empty'),
})

export const FaceDeletionSchema = z.object({
  jsonFile: z.string().min(1, 'JSON file path cannot be empty'),
  imageFile: z.string().min(1, 'Image file path cannot be empty'),
})


export const FaceRenameSchema = z.object({
  newName: z.string(),
})
