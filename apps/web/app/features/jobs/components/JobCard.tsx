import type { MetaFunction } from 'react-router'
import {
  VideoCameraIcon,
  LanguageIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  CubeIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { getStatusColor } from '~/features/jobs/utils'
import { JobStageIcon } from '~/features/jobs/components/JobStageIcon'
import { JobStatusIcon } from '~/features/jobs/components/JobStatusIcon'
import type { Job } from '@prisma/client'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/solid'
import { JOB_STAGE_CANCELLABLE } from "@shared/constants/jobs"
import { Button } from '@ui/components/Button'
import { useJob } from '../hooks/useCurrentJob'
import { useTranslation } from 'react-i18next'

export const meta: MetaFunction = () => {
  return [{ title: 'Jobs | Edit Mind' }]
}

interface JobCardProps {
  job: Job

}


export const JobCard: React.FC<JobCardProps> = ({ job, }) => {
  const { t } = useTranslation()
  const isIrrecoverable = job.status === 'irrecoverable'
  const canCancel = JOB_STAGE_CANCELLABLE.includes(job.stage) && job.status !== "cancelled" && job.status !== "error" && !isIrrecoverable
  const canRetry = (job.status === 'error' || job.status === 'cancelled') && !isIrrecoverable
  const { cancelJob, retryJob, loading } = useJob()

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

  return (
    <div
      key={job.id}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200 overflow-hidden"
    >
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <JobStatusIcon status={job.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate mb-1">{job.videoPath.split('/').pop()}</p>
            {job.status === 'processing' && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <JobStageIcon stage={job.stage} />
                <span>{t(`jobs.stage.${job.stage}`)}</span>
                <span className="text-white/40">•</span>
                <span>{job.progress}%</span>
              </div>
            )}
            {job.status !== 'processing' && (
              <p className="text-xs text-white/40 font-mono">{new Date(job.updatedAt).toLocaleString()}</p>
            )}
          </div>



          {canRetry && (
            <Button
              variant="secondary"
              title={t('jobs.actions.retryJob')}
              size="sm"
              onClick={handleRetry}
              disabled={loading}
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>{t('jobs.actions.retry')}</span>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              title={t('jobs.actions.cancelJob')}
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>{t('jobs.actions.cancel')}</span>
            </Button>
          )}

          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(
              job.status
            )} uppercase tracking-wider whitespace-nowrap`}
          >
            {t(`jobs.status.${job.status}`)}
          </span>
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

      {
        isIrrecoverable && (
          <div className="px-5 pb-5 pt-3 border-t border-white/5">
            <div className="flex items-start gap-2.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/80 mb-0.5">{t('jobs.details.cannotProcess')}</p>
                {job.failureReason && (
                  <p className="text-xs text-white/50 leading-relaxed">{job.failureReason}</p>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        job.status === 'done' && (
          <div className="px-5 pb-5 pt-3 border-t border-white/5">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {(job.transcodingTime || job.transcodingTime === 0) && (
                <div className="flex items-center gap-2">
                  <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.transcoding', { duration: humanizeSeconds(job.transcodingTime) })}</span>
                </div>
              )}
              {(job.transcriptionTime || job.transcriptionTime === 0) && (
                <div className="flex items-center gap-2">
                  <LanguageIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.transcription', { duration: humanizeSeconds(job.transcriptionTime) })}</span>
                </div>
              )}
              {(job.frameAnalysisTime || job.frameAnalysisTime === 0) && (
                <div className="flex items-center gap-2">
                  <VideoCameraIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.frameAnalysis', { duration: humanizeSeconds(job.frameAnalysisTime) })}</span>
                </div>
              )}
              {(job.sceneCreationTime || job.sceneCreationTime === 0) && (
                <div className="flex items-center gap-2">
                  <CubeIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.sceneCreation', { duration: humanizeSeconds(job.sceneCreationTime) })}</span>
                </div>
              )}
              {(job.textEmbeddingTime || job.textEmbeddingTime === 0) && (
                <div className="flex items-center gap-2">
                  <LanguageIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.textEmbedding', { duration: humanizeSeconds(job.textEmbeddingTime) })}</span>
                </div>
              )}
              {(job.visualEmbeddingTime || job.visualEmbeddingTime === 0) && (
                <div className="flex items-center gap-2">
                  <PhotoIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.visualEmbedding', { duration: humanizeSeconds(job.visualEmbeddingTime) })}</span>
                </div>
              )}
              {(job.audioEmbeddingTime || job.audioEmbeddingTime === 0) && (
                <div className="flex items-center gap-2">
                  <SpeakerWaveIcon className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/60">{t('jobs.details.audioEmbedding', { duration: humanizeSeconds(job.audioEmbeddingTime) })}</span>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  )
}