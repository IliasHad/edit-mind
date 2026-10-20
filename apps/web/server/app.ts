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
// and Docker host were the same machine). The WS upgrade itself is wired
// up in server.js via `wsProxy.upgrade`, since Express doesn't forward
// the underlying HTTP server's 'upgrade' event automatically.
export const wsProxy = createProxyMiddleware({
  router: () => env.BACKGROUND_JOBS_URL,
  changeOrigin: true,
  ws: true,
})
app.use('/socket.io', wsProxy)

app.use(
  createRequestHandler({
    build: () => import('virtual:react-router/server-build'),
  })
)
