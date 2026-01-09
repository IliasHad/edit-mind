import ScenesList from '~/features/videos/components/ScenesList'
import { type Scene } from '@shared/types/scene'

interface ScenesSidebarProps {
  scenes: Scene[]
  activeScene: Scene
  onSceneClick: (scene: Scene) => void
}

export function ScenesSidebar({ scenes, activeScene, onSceneClick }: ScenesSidebarProps) {
  return (
    <div className="lg:sticky lg:top-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Scenes</h2>
      </div>
      <div className="space-y-2">
        <ScenesList scenes={scenes} activeScene={activeScene} onSceneClick={onSceneClick} />
      </div>
    </div>
  )
}
