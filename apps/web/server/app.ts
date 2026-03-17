import 'react-router'
import { createRequestHandler } from '@react-router/express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import express from 'express'
import { env } from '../app/env'

export const app = express()

app.use(
  '/internal',
  createProxyMiddleware({
    router: () => `${env.BACKGROUND_JOBS_URL}/internal`,
    changeOrigin: true,
  })
)
app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  })
)
