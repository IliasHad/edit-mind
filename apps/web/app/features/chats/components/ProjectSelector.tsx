import { FolderOpenIcon } from '@heroicons/react/24/solid'
import { CheckIcon } from '@heroicons/react/24/outline'
import type { Project } from '@prisma/client'

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject?: Project | undefined
  onSelectProject: (project: Project | undefined) => void
}

export function ProjectSelector({ projects, selectedProject, onSelectProject }: ProjectSelectorProps) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 max-h-72 overflow-auto
                            bg-white dark:bg-zinc-900
                            ring-1 ring-black/10 dark:ring-white/10
                            rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/30
                            py-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="px-3 py-2 border-b border-black/5 dark:border-white/10">
        <p className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wide">Select Project</p>
      </div>

      <button
        onClick={() => onSelectProject(undefined)}
        className="w-full flex items-center justify-between px-4 py-3
                             text-sm text-zinc-700 dark:text-zinc-300
                             hover:bg-zinc-50 dark:hover:bg-zinc-800
                             transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600">
            <FolderOpenIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-zinc-500 dark:text-zinc-400">All projects</span>
        </div>
        {!selectedProject && <CheckIcon className="w-4 h-4 text-black dark:text-white shrink-0" />}
      </button>

      <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project)}
          className="w-full flex items-center justify-between px-4 py-3
                               text-sm text-zinc-700 dark:text-zinc-300
                               hover:bg-zinc-50 dark:hover:bg-zinc-800
                               transition-colors duration-150 group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.name}</span>
          </div>
          {selectedProject?.id === project.id && (
            <CheckIcon className="w-4 h-4 text-black dark:text-white shrink-0 ml-2" />
          )}
        </button>
      ))}
    </div>
  )
}
