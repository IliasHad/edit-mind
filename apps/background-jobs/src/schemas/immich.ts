import { z } from 'zod'

export const ImmichImporterRequestSchema = z.object({
    integrationId: z.string()
})
