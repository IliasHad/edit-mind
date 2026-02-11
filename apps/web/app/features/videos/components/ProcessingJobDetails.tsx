import type { Job } from '@prisma/client'
import { humanizeSeconds } from '~/features/shared/utils/duration'
import { type FrameAnalysisPluginAnalysis, type FrameAnalysisStageAnalysis } from '@shared/types/analysis'

interface ProcessingJobDetailsProps {
  job: Job
}

export function ProcessingJobDetails({ job }: ProcessingJobDetailsProps) {
  const processingTimes = [
    { label: 'Frame Analysis', value: job.frameAnalysisTime },
    { label: 'Scene Creation', value: job.sceneCreationTime },
    { label: 'Transcription', value: job.transcriptionTime },
    { label: 'Text Embedding', value: job.textEmbeddingTime },
    { label: 'Audio Embedding', value: job.audioEmbeddingTime },
    { label: 'Visual Embedding', value: job.visualEmbeddingTime },
  ]

  if (job) {
    const frameAnalysisPlugins = job.frameAnalysisPlugins
      ? (JSON.parse(JSON.stringify(job.frameAnalysisPlugins)) as FrameAnalysisPluginAnalysis[])
      : []

    const frameAnalysisStages = job.frameAnalysisStages
      ? (JSON.parse(JSON.stringify(job.frameAnalysisStages || "[]")) as FrameAnalysisStageAnalysis[])
      : []


    return (
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
        <div className="px-8 py-6 border-b border-black/10 dark:border-white/10">
          <h3 className="text-base font-semibold text-black dark:text-white">Processing Details</h3>
        </div>

        <div className="p-8 space-y-12">
          <div>
            <h4 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider mb-6">
              Processing Times
            </h4>
            <div className="grid grid-cols-2 gap-6">
              {processingTimes.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="text-xs text-black/50 dark:text-white/50">{item.label}</div>
                  <div className="text-lg font-semibold text-black dark:text-white tabular-nums">
                    {item.value && item.value >= 0 ? humanizeSeconds(item.value) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {frameAnalysisPlugins.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider mb-6">
                Video Frame Analysis Plugins
              </h4>
              <div className="space-y-1">
                {frameAnalysisPlugins
                  .sort((a, b) => b.duration - a.duration)
                  .map((plugin, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-black dark:text-white mb-1">
                          {plugin.name.replace('Plugin', '')}
                        </div>
                        <div className="text-xs text-black/50 dark:text-white/50">
                          {plugin.frameProcessed.toLocaleString()} frames
                        </div>
                      </div>
                      <div className="text-base font-semibold text-black dark:text-white tabular-nums">
                        {humanizeSeconds(plugin.duration)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {frameAnalysisStages.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider mb-6">
                Video Frame Analysis Stages
              </h4>
              <div className="space-y-1">
                {frameAnalysisStages
                  .filter((stage) => stage.duration > 0)
                  .sort((a, b) => b.duration - a.duration)
                  .map((stage) => (
                    <div
                      key={stage.name}
                      className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-black dark:text-white mb-1">
                          {stage.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                      </div>
                      <div className="text-base font-semibold text-black dark:text-white tabular-nums">
                        {stage.duration <= 0.1 ? "≈1s" : humanizeSeconds(stage.duration)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}