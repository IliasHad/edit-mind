import compression from 'compression'
import express from 'express'
import morgan from 'morgan'

const DEVELOPMENT = process.env.NODE_ENV === 'development'
const PORT = Number.parseInt(process.env.PORT || '3745', 10)
const BUILD_PATH = '/app/apps/web/build/server/index.js'

const app = express()

app.use(compression())
app.disable('x-powered-by')

if (DEVELOPMENT) {
  console.log('Starting development server')
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    })
  )
  app.use(viteDevServer.middlewares)
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule('./server/app.ts')
      return await source.app(req, res, next)
    } catch (error) {
      if (typeof error === 'object' && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error)
      }
      next(error)
    }
  })
} else {
  console.log('Starting production server')

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
    next()
  })

  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }))
  app.use(morgan('tiny'))
  app.use(express.static('build/client', { maxAge: '1h' }))

  const { app: requestHandler } = await import(BUILD_PATH)

  app.use(requestHandler)
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on 0.0.0.0:${PORT}`)
})
