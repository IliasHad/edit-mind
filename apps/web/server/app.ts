import 'react-router'
import { createRequestHandler } from '@react-router/express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import express from 'express'

export const app = express()

app.use(
  '/internal',
  createProxyMiddleware({
    target: process.env.BACKGROUND_JOBS_URL,
    changeOrigin: true,
  })
)

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  })
)
