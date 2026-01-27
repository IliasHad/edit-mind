import { FolderIcon } from '@heroicons/react/24/solid'
import { Link } from 'react-router'

export function ProjectBadge({ project }: { project: { videos: number; name: string; id: string } }) {
  return (
    <Link
      to={`/app/projects/${project.id}`}
      className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
    >
      <FolderIcon className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
      <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{project.name}</span>
      <span className="text-xs opacity-60">({project.videos})</span>
    </Link>
  )
}
