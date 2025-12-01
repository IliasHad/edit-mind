import { z } from 'zod'
import { LoginSchema } from '~/features/auth/schemas/auth'
import { prisma } from './database'
import { getSession, commitSession } from './session'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'

export async function login(request: Request, values: z.infer<typeof LoginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: values.email } })
  if (!user) return { error: 'Invalid email or password' }

  const passwordMatch = await bcrypt.compare(values.password, user.password)
  if (!passwordMatch) return { error: 'Invalid email or password' }

  const session = await getSession(request.headers.get('Cookie'))
  session.set('userId', user.id)

  return redirect('/app/home', {
    headers: { 'Set-Cookie': await commitSession(session) },
  })
}