import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { FolderIcon, TrashIcon } from '@heroicons/react/24/outline'
import { smartFormatDate } from '~/features/shared/utils/duration'
import { getStatusInfo } from '../utils'
import type { FolderWithJobs } from '../types'

interface FolderCardProps {
  folder: FolderWithJobs
  index: number
  isScanning: boolean
  onDelete: (folder: FolderWithJobs) => void
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, index, isScanning, onDelete }) => {
  const folderName = folder.path.split('/').pop() || folder.path

  const statusInfo = getStatusInfo(folder.status)

  return (
    <motion.div
      key={folder.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-200 overflow-hidden group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <Link to={`/app/folders/${folder.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <FolderIcon className="size-5 shrink-0 text-white/70 group-hover:text-white transition-colors" />
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors">
                {folderName}
              </h3>
            </div>
            <p className="text-xs text-white/40 font-mono truncate">{folder.path}</p>
          </Link>

          <button
            onClick={(e) => {
              e.preventDefault()
              onDelete(folder)
            }}
            disabled={isScanning}
            aria-label={`Delete folder ${folderName}`}
            className="p-2 rounded-lg text-xs font-medium transition-all text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className={`flex items-center gap-2 font-medium ${statusInfo.color}`}>
            {statusInfo.icon}
            <span>{statusInfo.text}</span>
          </div>

          <span className="text-white/40" aria-hidden="true">
            •
          </span>

          <div className="text-white/60">
            <span className="font-semibold text-white">{folder.videoCount || 0}</span>{' '}
            {folder.videoCount === 1 ? 'video' : 'videos'}
          </div>

          {folder.lastScanned && (
            <>
              <span className="text-white/40" aria-hidden="true">
                •
              </span>
              <div className="text-white/60">
                Last scan: <span className="font-semibold text-white">{smartFormatDate(folder.lastScanned)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {folder.status === 'scanning' && (
        <div className="relative h-1 bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 bg-white"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  )
}
