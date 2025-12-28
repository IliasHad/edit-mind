import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name cannot exceed 100 characters'),
  instructions: z.string().max(5000, 'Instructions cannot exceed 5000 characters').optional().or(z.literal('')),
  videoIds: z.array(z.string()).optional(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;
