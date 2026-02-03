import { getSession } from './session'
import { UserModel } from '@db/index'

export async function getUser(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  if (!userId) {
    return null
  }

  const user = await UserModel.findById(userId)

  return user
}

export async function requireUserId(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  if (!userId) {
    throw new Error('User is not authorized')
  }

  const user = await UserModel.findById(userId)

  if (!user) {
    throw new Error('User is not authorized')
  }

  return user.id
}

export async function requireUser(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  if (!userId) {
    throw new Error('User is not authorized')
  }

  const user = await UserModel.findById(userId)

  if (!user) {
    throw new Error('User is not authorized')
  }

  return user
}
