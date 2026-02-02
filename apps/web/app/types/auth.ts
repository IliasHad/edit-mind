import { z } from 'zod'
import type { LoginSchema } from '~/features/auth/schemas/auth'


export type LoginFormValues = z.infer<typeof LoginSchema>