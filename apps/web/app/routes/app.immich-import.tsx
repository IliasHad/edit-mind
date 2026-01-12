import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  KeyIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useLoaderData, useActionData, Form, useNavigation, type MetaFunction } from 'react-router'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { getImmichConfig, saveImmichIntegration, deleteImmichIntegration } from '../services/immich.server'
import { getUser, requireUserId } from '~/services/user.sever'
import { ImmichActionSchema, ImmichConfigFormSchema } from '@immich/schemas/immich'
import { backgroundJobsFetch } from '~/services/background.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  try {
    const config = await getImmichConfig(userId)
    return { hasIntegration: !!config, baseUrl: config?.baseUrl }
  } catch (error) {
    console.error('Loader error:', error)
    return { hasIntegration: false, baseUrl: null }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request)

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }
  try {
    const formData = await request.formData()
    const rawData = Object.fromEntries(formData)

    const actionResult = ImmichActionSchema.safeParse(rawData)

    if (!actionResult.success) {
      return {
        success: false,
        error: 'Invalid action',
      }
    }

    const action = actionResult.data

    switch (action.intent) {
      case 'start-import':
        {
        const configResult = ImmichConfigFormSchema.safeParse({
          apiKey: action.apiKey,
          baseUrl: action.baseUrl,
        })

        if (!configResult.success) {
          return {
            success: false,
            error: 'Invalid configuration',
            fieldErrors: configResult.error.flatten().fieldErrors,
          }
        }

        const integration = await saveImmichIntegration(user.id, configResult.data.apiKey, configResult.data.baseUrl)
        await backgroundJobsFetch(
          '/internal/immich/import',
          {
            integrationId: integration.id,
          },
          user
        )

        return { success: true, message: 'Import started successfully' }
      }

      case 'refresh-import': {
        const config = await getImmichConfig(user.id)
        if (!config) {
          return { success: false, error: 'No integration found' }
        }
        const integration = await getImmichConfig(user.id)
        if (integration)
          await backgroundJobsFetch(
            '/internal/immich/import',
            {
              integrationId: integration.id,
            },
            user
          )
        return { success: true, message: 'Face labeling refresh triggered successfully' }
      }

      case 'delete-integration': {
        await deleteImmichIntegration(user.id)
        return { success: true, message: 'Integration deleted successfully' }
      }

      default:
        return { success: false, error: 'Invalid action' }
    }
  } catch (error) {
    console.error('Action error:', error)
    return { success: false, error: 'An error occurred. Please try again.' }
  }
}

export const meta: MetaFunction = () => [{ title: 'Immich Integration | Edit Mind' }]

export default function ImmichIntegrationPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [showApiKeyForm, setShowApiKeyForm] = useState(!data?.hasIntegration)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isSubmitting = navigation.state === 'submitting'
  const isRefreshing = navigation.formData?.get('intent') === 'refresh-import'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget)
    const apiKey = formData.get('apiKey') as string
    const baseUrl = formData.get('baseUrl') as string

    const result = ImmichConfigFormSchema.safeParse({ apiKey, baseUrl })

    if (!result.success) {
      e.preventDefault()
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        apiKey: fieldErrors.apiKey?.[0] || '',
        baseUrl: fieldErrors.baseUrl?.[0] || '',
      })
      return
    }

    setErrors({})
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl  px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-black dark:text-white tracking-tight mb-2">Immich Integration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Import face labels from Immich to enhance your video labeling workflow
          </p>
        </header>

        <AnimatePresence>
          {actionData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl border ${
                actionData.success
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {actionData.success ? (
                  <CheckCircleIcon className="w-5 h-5 shrink-0" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                )}
                <p className="text-sm font-medium">{actionData.message || actionData.error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white dark:bg-transparent rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {showApiKeyForm ? (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-1">
                  {data?.hasIntegration ? 'Update Integration' : 'Connect Immich'}
                </h2>
                <p className="text-md text-gray-600 dark:text-gray-400">
                  {data?.hasIntegration
                    ? 'Update your API key or base URL'
                    : 'Enter your Immich credentials to get started'}
                </p>
              </div>

              <Form method="post" onSubmit={handleSubmit} className="space-y-5">
                <input type="hidden" name="intent" value="start-import" />

                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    API KeyIcon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    name="apiKey"
                    placeholder="Enter your Immich API key"
                    required
                    className={`w-full px-4 py-2.5 bg-white dark:bg-gray-950 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.apiKey || actionData?.fieldErrors?.apiKey
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                  />
                  {(errors.apiKey || actionData?.fieldErrors?.apiKey) && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5" />
                      {errors.apiKey || actionData?.fieldErrors?.apiKey?.[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Base URL
                  </label>
                  <input
                    type="url"
                    id="baseUrl"
                    name="baseUrl"
                    placeholder="http://host.docker.internal:2283"
                    defaultValue={data?.baseUrl || 'http://host.docker.internal:2283'}
                    className={`w-full px-4 py-2.5 bg-white dark:bg-gray-950 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                      errors.baseUrl || actionData?.fieldErrors?.baseUrl
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-purple-500/20 focus:border-purple-500'
                    }`}
                  />
                  {(errors.baseUrl || actionData?.fieldErrors?.baseUrl) && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5" />
                      {errors.baseUrl || actionData?.fieldErrors?.baseUrl?.[0]}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">
                    The URL where your Immich instance is hosted
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        {data?.hasIntegration ? 'Update & Restart Import' : 'Connect & Start Import'}
                      </>
                    )}
                  </button>

                  {data?.hasIntegration && (
                    <button
                      type="button"
                      onClick={() => setShowApiKeyForm(false)}
                      className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Form>

              <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                <div className="flex gap-3">
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                      How to Get Your API KeyIcon
                    </h3>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 mb-4">
                      <li className="flex items-start gap-2">
                        <span className="font-medium min-w-5">1.</span>
                        <span>Open your Immich instance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium min-w-5">2.</span>
                        <span>Go to Account Settings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium min-w-5">3.</span>
                        <span>Navigate to API Keys section</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium min-w-5">4.</span>
                        <span>Create a new API key with the required scopes (see below)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium min-w-5">5.</span>
                        <span>Copy and paste the key above</span>
                      </li>
                    </ol>

                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Required API Scopes</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Your API key must have these permissions to enable face labeling:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          person.read
                        </code>
                        <span>Access people and face data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          face.read
                        </code>
                        <span>Read face metadata for labeling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          asset.read
                        </code>
                        <span>Read asset information (photos)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          asset.download
                        </code>
                        <span>Download assets for processing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          asset.share
                        </code>
                        <span>Reference assets in workflows</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-mono text-blue-900 dark:text-blue-100 shrink-0">
                          timeline.read
                        </code>
                        <span>Associate faces with timeline events</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-black dark:text-white mb-2">Integration Active</h2>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-2">
                  Face labels are syncing automatically from Immich
                </p>
                {data?.baseUrl && (
                  <p className="text-base text-gray-500 dark:text-gray-500 mb-8">
                    Connected to: <span className="font-mono">{data.baseUrl}</span>
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  <Form method="post">
                    <input type="hidden" name="intent" value="refresh-import" />
                    <button
                      type="submit"
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isRefreshing ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="w-4 h-4" />
                          Refresh Face Labels
                        </>
                      )}
                    </button>
                  </Form>

                  <button
                    onClick={() => setShowApiKeyForm(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-[0.98]"
                  >
                    <KeyIcon className="w-4 h-4" />
                    Update Settings
                  </button>

                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-integration" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-300 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Remove Integration
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  )
}
