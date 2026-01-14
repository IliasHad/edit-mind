import { z } from 'zod'

export const RelinkVideoSchema = z.object({
    newSource: z.string(),
})
