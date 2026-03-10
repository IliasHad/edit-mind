import { chromaMetadataSchema } from '@shared/schemas'
import { z } from 'zod'

export type ChromaMetadata = z.infer<typeof chromaMetadataSchema>
