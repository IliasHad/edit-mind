import {
  VideoCameraIcon,
  LanguageIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  CubeIcon,
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { getStageLabel, getStatusColor } from '~/features/jobs/utils'
import { JobStageIcon } from '~/features/jobs/components/JobStageIcon'
import { JobStatusIcon } from '~/features/jobs/components/JobStatusIcon'
import type { Job } from '@prisma/client'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/solid'
import { JOB_STAGE_CANCELLABLE } from "@shared/constants/jobs"
import { Button } from '@ui/components/Button'
import { useJob } from '../hooks/useCurrentJob'

interface JobCardProps {
  job: Job

}


export const JobCard: React.FC<JobCardProps> = ({ job, }) => {
  const isIrrecoverable = job.status === 'irrecoverable'
  const canCancel = JOB_STAGE_CANCELLABLE.includes(job.stage) && job.status !== "cancelled" && job.status !== "error" && !isIrrecoverable
  const canRetry = (job.status === 'error' || job.status === 'cancelled') && !isIrrecoverable
  const canDelete = job.status === 'done' || job.status === 'error' || job.status === 'cancelled' || isIrrecoverable
  const { cancelJob, retryJob, deleteJob, loading } = useJob()

  const handleRetry = async () => {
    try {
      await retryJob(job.id)
    } catch (error) {
      console.error(error)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelJob(job.id)
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteJob(job.id)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div
      key={job.id}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200 overflow-hidden"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 mt-0.5">
            <JobStatusIcon status={job.status} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate mb-1">{job.videoPath.split('/').pop()}</p>
            {job.status === 'processing' && (
              <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
                <JobStageIcon stage={job.stage} />
                <span>{getStageLabel(job.stage)}</span>
                <span className="text-white/40">•</span>
                <span>{job.progress}%</span>
              </div>
            )}
            {job.status !== 'processing' && (
              <p className="text-xs text-white/40 font-mono">{new Date(job.updatedAt).toLocaleString()}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {canRetry && (
              <Button variant="secondary" title="Retry job" size="sm" onClick={handleRetry} disabled={loading}>
                <ArrowPathIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Retry</span>
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" title="Cancel job" size="sm" onClick={handleCancel} disabled={loading}>
                <XMarkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" title="Delete job" size="sm" onClick={handleDelete} disabled={loading}>
                <TrashIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
            <span
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(job.status)} uppercase tracking-wider whitespace-nowrap`}
            >
              {job.status === 'irrecoverable' ? 'Unsupported' : job.status}
            </span>
          </div>
        </div>
      </div>

      {
        job.status === 'processing' && (
          <div className="relative h-1 bg-white/5">
            <motion.div
              className="absolute inset-y-0 left-0 bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${job.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )
      }

      {isIrrecoverable && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-white/5">
          <p className="text-xs font-medium text-white/80 mb-0.5">Cannot be processed</p>
          {job.failureReason && (
            <p className="text-xs text-white/50 leading-relaxed break-words">{job.failureReason}</p>
          )}
        </div>
      )}

      {job.status === 'done' && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            {(job.transcodingTime != null && job.transcodingTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <ArrowsRightLeftIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Transcoding: {humanizeSeconds(job.transcodingTime)}</span>
              </div>
            )}
            {(job.transcriptionTime != null && job.transcriptionTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <LanguageIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Transcription: {humanizeSeconds(job.transcriptionTime)}</span>
              </div>
            )}
            {(job.frameAnalysisTime != null && job.frameAnalysisTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <VideoCameraIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Frame Analysis: {humanizeSeconds(job.frameAnalysisTime)}</span>
              </div>
            )}
            {(job.sceneCreationTime != null && job.sceneCreationTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <CubeIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Scene Creation: {humanizeSeconds(job.sceneCreationTime)}</span>
              </div>
            )}
            {(job.textEmbeddingTime != null && job.textEmbeddingTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <LanguageIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Text Embedding: {humanizeSeconds(job.textEmbeddingTime)}</span>
              </div>
            )}
            {(job.visualEmbeddingTime != null && job.visualEmbeddingTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <PhotoIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Visual Embedding: {humanizeSeconds(job.visualEmbeddingTime)}</span>
              </div>
            )}
            {(job.audioEmbeddingTime != null && job.audioEmbeddingTime >= 0) && (
              <div className="flex items-center gap-1.5 min-w-0">
                <SpeakerWaveIcon className="w-3.5 h-3.5 shrink-0 text-white/40" />
                <span className="text-white/60 truncate">Audio Embedding: {humanizeSeconds(job.audioEmbeddingTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div >
  )
}