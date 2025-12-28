import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData, useRevalidator, useFetcher } from 'react-router'
import { prisma } from '~/services/database'
import { useEffect } from 'react'
import { JobsGrid } from '~/features/settings/components/JobsGrid'
import { backgroundJobsFetch } from '~/services/background.server'
import type { Folder } from '@prisma/client'
import { logger } from '@shared/services/logger'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) throw new Response('Folder not found', { status: 404 })

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      jobs: {
        orderBy: { updatedAt: 'desc' },
        where: {
          OR: [{ status: 'pending' }, { status: 'processing' }],
        },
      },
    },
  })

  if (!folder) throw new Response('Folder not found', { status: 404 })

  return { folder }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params
  if (!id) throw new Response('Folder not found', { status: 404 })

  const formData = await request.formData()
  const intent = formData.get('intent')

  logger.debug(intent)
  
  if (intent === 'rescan') {
    const folder = await prisma.folder.findUnique({
      where: { id },
    })

    if (!folder) throw new Response('Folder not found', { status: 404 })

    await backgroundJobsFetch<{ folderPath: string }, { folder: Folder }>('/folders/trigger', {
      folderPath: folder.path,
    })
  }
  return { success: false, message: 'Invalid action' }
}

export const meta: MetaFunction = ({ data }) => {
  if (!data?.folder) {
    return [{ title: 'Folder not found | Edit Mind' }]
  }

  const folderName = data.folder.path.split('/').pop() || 'Folder'
  return [
    {
      title: `${folderName} Status | Edit Mind`,
    },
  ]
}

export default function FolderStatusPage() {
  const { folder } = useLoaderData()
  const revalidator = useRevalidator()
  const fetcher = useFetcher()

  const isScanning = fetcher.state !== 'idle'

  // Revalidate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (revalidator.state === 'idle') {
        revalidator.revalidate()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [revalidator])

  const handleRescan = () => {
    fetcher.submit({ intent: 'rescan' }, { method: 'post' })
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-12 py-16">
        <header className="mb-12">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-2 font-sans">
            {folder.path.split('/').pop()}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-mono">{folder.path}</p>
        </header>
        <div className="my-4">
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className="inline-flex items-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isScanning ? 'Scanning...' : 'Rescan Folder'}
          </button>
        </div>
        <section>
          {fetcher.data?.message && (
            <div
              className={`rounded-md p-4 ${fetcher.data.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
            >
              {fetcher.data.message}
            </div>
          )}

          {folder.jobs.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-6">
                Active Jobs — {folder.jobs.length} {folder.jobs.length === 1 ? 'job' : 'jobs'}
              </h2>
              <JobsGrid jobs={folder.jobs} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 dark:bg-white/5 px-12 py-24 w-full">
                <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">
                  {' '}
                  No active video indexing jobs in this folder.
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
                  Video indexing jobs appear here when you upload or process new videos. Check back soon!
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
