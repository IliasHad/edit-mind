import { z } from 'zod'

export const RelinkVideoSchema = z.object({
    newSource: z.string(),
})

export const UpdateVideoLocationSchema = z.object({
    newLocation: z.string().transform(value => value.trim()),
})

export const AddVideoLabelsSchema = z.object({
    labels: z.array(z.record(z.string().transform(value => value.trim()), z.string().transform(value => value.trim()))),
})
