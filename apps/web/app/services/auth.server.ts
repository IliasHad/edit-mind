import { z } from 'zod'
import { LoginSchema } from '~/features/auth/schemas/auth'
import { getSession, commitSession } from './session'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { UserModel } from '@db/index'

export async function login(request: Request, values: z.infer<typeof LoginSchema>) {
  const user = await UserModel.findByEmail(values.email)
  if (!user) return { error: 'Invalid email or password' }

  const passwordMatch = await bcrypt.compare(values.password, user.password)
  if (!passwordMatch) return { error: 'Invalid email or password', fieldErrors: [] }

  const session = await getSession(request.headers.get('Cookie'))
  session.set('userId', user.id)

  const headers = new Headers()
  headers.set('Set-Cookie', await commitSession(session))

  return redirect('/app/home', { headers })
}