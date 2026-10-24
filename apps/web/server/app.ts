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

// Proxies the background-jobs Socket.IO server so the browser only ever
// talks to this web server's own origin. Without this, the client would
// need a separate publicly reachable URL for background-jobs (previously
// hardcoded to http://localhost:4000, which only worked when the browser
// and Docker host were the same machine). The path filter keeps the complete
// `/socket.io` path for both polling requests and raw WebSocket upgrades;
// mounting this middleware at `/socket.io` would strip the path from polling
// requests before they reach the background-jobs Socket.IO server.
export const wsProxy = createProxyMiddleware({
  pathFilter: '/socket.io',
  router: () => env.BACKGROUND_JOBS_URL,
  changeOrigin: true,
  ws: true,
})
app.use(wsProxy)

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  })
)
