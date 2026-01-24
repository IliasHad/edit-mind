import { z } from 'zod'

export const ImmichImporterRequestSchema = z.object({
    integrationId: z.string().min(1, 'integrationId cannot be empty')
})
