import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { useEffect } from 'react'
import type { Job } from '@prisma/client'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useCurrentFolder } from '~/features/folders/hooks/useCurrentFolder'
import { JobStatusIcon } from '~/features/jobs/components/JobStatusIcon'
import { JobCard } from '~/features/jobs/components/JobCard'
import { useJobs } from '~/features/jobs/hooks/useJobs'
import { useParams, type MetaFunction } from 'react-router'
import { Button } from '@ui/components/Button'

export const meta: MetaFunction = () => {
  return [{ title: 'Folder Details Page | Edit Mind' }]
}

export default function FolderDetailsPage() {
  const { currentFolder, loading, rescanFolder } = useCurrentFolder()
  const { id } = useParams()
  const { fetchJobsByFolderId, jobs, jobsStatus, total } = useJobs()

  useEffect(() => {
    if (id) fetchJobsByFolderId(id)
  }, [fetchJobsByFolderId, id])

  const handleRescan = async () => {
    if (id) await rescanFolder(id)
  }
  if (!currentFolder) return null

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full max-w-5xl mx-auto px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">
                {currentFolder.path.split('/').pop()}
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-white/50 font-mono">{currentFolder.path}</p>
                {total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-white/60">
                      {total} {total === 1 ? 'Job' : 'Jobs'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleRescan}
                loading={loading}
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                {loading ? 'Scanning...' : 'Rescan Folder'}
              </Button>
            </div>
          </div>

          {jobsStatus && Object.keys(jobsStatus).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-4 gap-4 mb-8"
            >
              {Object.entries(jobsStatus).map(([status, count]) => (
                <div key={status} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{status}</span>
                    <JobStatusIcon status={status as Job['status']} />
                  </div>
                  <p className="text-2xl font-semibold text-white">{count}</p>
                </div>
              ))}
            </motion.div>
          )}

          {jobs.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Processing Queue</h2>
              {jobs.map((job: Job, index: number) => (
                <JobCard job={job} index={index} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center py-24 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Active Jobs</h3>
              <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
                Video indexing jobs will appear here when you add new videos to this folder.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </DashboardLayout>
  )
}
