import { createCookieSessionStorage } from 'react-router'
import { env } from '~/env'

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [env.SESSION_SECRET],
    secure: false, 
    maxAge: 60 * 60 * 24 * 30,
    domain: undefined
  },
})

export const { getSession, commitSession, destroySession, } = sessionStorage
