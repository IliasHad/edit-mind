import { FolderIcon } from '@heroicons/react/24/solid'
import { Link } from "react-router";

export function ProjectBadge({ project }: { project: { videos: number, name: string, id: string } }) {
  return (
    <Link
      to={`/app/projects/${project.id}`}
      className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border border-gray-900 dark:border-gray-100 rounded-full hover:bg-gray-900 hover:text-white dark:hover:bg-gray-100 dark:hover:text-gray-900 transition-all duration-200 cursor-pointer"
    >
      <FolderIcon className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">{project.name}</span>
      <span className="text-xs opacity-60">({project.videos})</span>
    </Link>
  );
}