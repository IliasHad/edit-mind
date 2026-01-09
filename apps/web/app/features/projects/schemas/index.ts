import { z } from 'zod'

export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name cannot exceed 100 characters'),
  instructions: z.string().max(5000, 'Instructions cannot exceed 5000 characters'),
  videoIds: z.array(z.string()).min(1, 'At least one video is require')
})

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;


export const ProjectUpdateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name cannot exceed 100 characters'),
  instructions: z.string().max(5000, 'Instructions cannot exceed 5000 characters'),
  videoIds: z.array(z.string()).min(1, 'At least one video is require')
})

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;
