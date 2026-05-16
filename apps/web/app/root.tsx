import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
  type LinksFunction,
  type LoaderFunctionArgs,
} from 'react-router'
import { MotionConfig } from 'framer-motion'
import './app.css'
import { SessionProvider } from './features/auth/providers/SessionProvider'
import { getUser } from './services/user.server'
import { useApp } from './features/shared/hooks/useApp'
import { useEffect } from 'react'
import { logger } from '@shared/services/logger'
import { getLatestReleaseVersion } from './services/github.server'
import semver from 'semver'
import { AppSettingsModel } from '@db/index'
import { DEFAULT_LANGUAGE } from '@shared/types/language'
import { I18nProvider } from './i18n/I18nProvider'
import { i18next, resolveLanguage } from './i18n'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request)
    const appPkg = await import('../package.json')

    const latestVersion = await getLatestReleaseVersion()

    const currentVersion = appPkg.version
    const isLatest =
      latestVersion && semver.valid(latestVersion) && semver.valid(currentVersion)
        ? semver.gte(currentVersion, latestVersion)
        : true

    let language = DEFAULT_LANGUAGE
    try {
      language = await AppSettingsModel.getLanguage()
    } catch (settingsError) {
      logger.error(settingsError)
    }

    return {
      language,
      session: {
        isAuthenticated: !!user,
        user: { email: user?.email },
      },
      app: {
        version: currentVersion,
        latestVersion,
        isLatest,
      },
    }
  } catch (error) {
    logger.error(error)
    return {
      language: DEFAULT_LANGUAGE,
      session: undefined,
      app: undefined,
    }
  }
}

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>()
  const { setApp } = useApp()

  useEffect(() => {
    setApp(data.app)

    return () => {
      setApp(undefined)
    }
  }, [setApp, data])

  const language = resolveLanguage(data?.language)

  return (
    <html lang={language} className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <I18nProvider language={language}>
          <MotionConfig reducedMotion="user">
            <SessionProvider initialSession={data?.session}>{children}</SessionProvider>
          </MotionConfig>
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()
  const language = resolveLanguage(i18next.resolvedLanguage || i18next.language)
  let message = i18next.t('root.errors.title')
  let details = i18next.t('root.errors.genericDetails')
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? i18next.t('root.errors.notFoundTitle') : i18next.t('root.errors.genericTitle')
    details = error.status === 404 ? i18next.t('root.errors.notFoundDetails') : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{message}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <main className="pt-16 p-4 container mx-auto">
          <h1>{message}</h1>
          <p>{details}</p>
          {stack && (
            <pre className="w-full p-4 overflow-x-auto">
              <code>{stack}</code>
            </pre>
          )}
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}