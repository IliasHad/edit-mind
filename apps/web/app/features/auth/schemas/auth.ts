import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(4, { message: 'Password must be at least 4 characters' }),
})

export const RegisterSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(4, { message: 'Password must be at least 4 characters' }),
    confirmationPassword: z.string().min(4, { message: 'Password must be at least 4 characters' }),
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  })
  .refine((data) => data.password === data.confirmationPassword, {
    message: 'Passwords do not match',
    path: ['confirmationPassword'],
  })