import type { MetaFunction } from 'react-router'
import { VideoCameraIcon, LanguageIcon, PhotoIcon, SpeakerWaveIcon, CubeIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { getStageLabel, getStatusColor } from '~/features/jobs/utils'
import { JobStageIcon } from '~/features/jobs/components/JobStageIcon'
import { JobStatusIcon } from '~/features/jobs/components/JobStatusIcon'
import type { Job } from '@prisma/client'

export const meta: MetaFunction = () => {
  return [{ title: 'Jobs | Edit Mind' }]
}

interface JobCardProps {
  job: Job
  index: number
}

export const JobCard: React.FC<JobCardProps> = ({ job, index }) => {
  return (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
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
                <span>{getStageLabel(job.stage)}</span>
                <span className="text-white/40">•</span>
                <span>{job.progress}%</span>
              </div>
            )}
            {job.status !== 'processing' && (
              <p className="text-xs text-white/40 font-mono">{new Date(job.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(
            job.status
          )} uppercase tracking-wider whitespace-nowrap`}
        >
          {job.status}
        </span>
      </div>

      {job.status === 'processing' && (
        <div className="relative h-1 bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {job.status === 'done' && (
        <div className="px-5 pb-5 pt-3 border-t border-white/5">
          <div className="grid grid-cols-3 gap-4 text-xs">
            {job.transcriptionTime && (
              <div className="flex items-center gap-2">
                <LanguageIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Transcription: {humanizeSeconds(job.transcriptionTime)}</span>
              </div>
            )}
            {job.frameAnalysisTime && (
              <div className="flex items-center gap-2">
                <VideoCameraIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Frame Analysis: {humanizeSeconds(job.frameAnalysisTime)}</span>
              </div>
            )}
            {job.sceneCreationTime && (
              <div className="flex items-center gap-2">
                <CubeIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Scene Creation: {humanizeSeconds(job.sceneCreationTime)}</span>
              </div>
            )}
            {job.textEmbeddingTime && (
              <div className="flex items-center gap-2">
                <LanguageIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Text Embedding: {humanizeSeconds(job.textEmbeddingTime)}</span>
              </div>
            )}
            {job.visualEmbeddingTime && (
              <div className="flex items-center gap-2">
                <PhotoIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Visual Embedding: {humanizeSeconds(job.visualEmbeddingTime)}</span>
              </div>
            )}
            {job.audioEmbeddingTime && (
              <div className="flex items-center gap-2">
                <SpeakerWaveIcon className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60">Audio Embedding: {humanizeSeconds(job.audioEmbeddingTime)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
