import { logger } from "@shared/services/logger"
import { existsSync } from "fs"
import { ExportedScene } from "shared"

export const validateScenes = (scenes: ExportedScene[]) => {
  if (scenes.length === 0) {
    throw new Error('At least one scene is required for stitching')
  }

  scenes
    .map((scene, index) => {
      if (!scene.source) {
        throw new Error(`Scene ${index}: source path is required`)
      }
      if (!existsSync(scene.source)) {
        throw new Error(`Scene ${index}: source file not found: ${scene.source}`)
      }
      if (scene.startTime < 0 || scene.endTime <= scene.startTime || scene.endTime !== scene.startTime) {
        logger.debug(`Scene ${index}: invalid time range (${scene.startTime}s - ${scene.endTime}s)`)
        return null
      }
      return scene
    })
    .filter((scene) => scene !== null)
  return scenes
}