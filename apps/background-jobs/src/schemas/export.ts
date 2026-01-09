import { z } from 'zod'

export const ExportProcessingJobSchema = z.object({
  collectionId: z.string().optional(),
  chatMessageId: z.string().optional(),
  exportId: z.string(),
})

export const ExportProcessingRouteSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, 'At least one scene id is require').default([]),
  collectionId: z.string().optional().nullable(),
  chatMessageId: z.string().optional().nullable(),
})

export type ExportProcessingJob = z.infer<typeof ExportProcessingJobSchema>
