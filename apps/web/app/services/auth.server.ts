import { z } from 'zod'
import { LoginSchema, RegisterSchema } from '~/features/auth/schemas/auth'
import { getSession, commitSession, destroySession } from './session'
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

export async function register(request: Request, values: z.infer<typeof RegisterSchema>) {
  const exists = await UserModel.findByEmail(values.email)
  if (exists) return { error: 'An account with this email already exists' }

  const user = await UserModel.create({
    email: values.email,
    password: values.confirmationPassword,
    role: "admin",
    name: values.name
  })
  const session = await getSession(request.headers.get('Cookie'))
  session.set('userId', user.id)

  const headers = new Headers()
  headers.set('Set-Cookie', await commitSession(session))

  return redirect('/app/setup', { headers })
}

export async function logout(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))

  const headers = new Headers()
  headers.set('Set-Cookie', await destroySession(session))

  return redirect('/auth/login', { headers })
}
