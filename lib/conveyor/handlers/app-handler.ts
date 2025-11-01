import { type App, dialog, shell, type WebContents } from 'electron'
import { handle, sender } from '@/lib/main/shared'
import { findVideoFiles, generateThumbnail } from '@/lib/utils/videos'
import path from 'path'
import fs from 'fs/promises'
import { transcribeAudio } from '@/lib/utils/transcribe'
import { analyzeVideo } from '@/lib/utils/frameAnalyze'
import { createScenes } from '@/lib/utils/scenes'
import { existsSync, mkdirSync } from 'fs'
import { embedScenes } from '@/lib/utils/embed'
import { Scene } from '@/lib/types/scene'
import { generateSearchSuggestions } from '@/lib/utils/search'
import {
  filterExistingVideos,
  getAllVideosWithScenes,
  getByVideoSource,
  queryCollection,
  updateMetadata,
} from '@/lib/services/vectorDb'
import { generateActionFromPrompt } from '@/lib/services/llm'
import { stitchVideos } from '@/lib/utils/sticher'
import { exportToFcpXml } from '@/lib/utils/fcpxml'
import { convertTimeToWords } from '@/lib/utils/time'
import { pythonService } from '@/lib/services/pythonService'
import { getLocationName } from '@/lib/utils/location'
import { FACES_DIR, PROCESSED_VIDEOS_DIR, THUMBNAILS_DIR } from '@/lib/constants'

export const registerAppHandlers = (app: App, webContents: WebContents) => {
  const send = sender(webContents)
  handle('version', () => app.getVersion())
  handle('selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled) {
      return null
    }
    const folderPath = result.filePaths[0]
    const videos = await findVideoFiles(folderPath)
    return { folderPath, videos: videos.map((item) => item.path) }
  })
  handle('searchDocuments', async (prompt) => {
    try {
      const faces = prompt?.match(/@(\w+)/g)?.map((name: string) => name.substring(1)) || []

      const { shot_type, emotions, description, aspect_ratio, objects, duration, camera, transcriptionQuery } =
        await generateActionFromPrompt(prompt)

      const results = await queryCollection({
        faces,
        shot_type,
        emotions,
        description,
        aspect_ratio,
        objects,
        camera,
        transcriptionQuery,
      })
      return { results, duration, aspect_ratio, faces }
    } catch (e) {
      console.error('Failed to search documents:', e)
      throw e
    }
  })

  handle('getAllVideos', async () => {
    try {
      const videos = await getAllVideosWithScenes()

      return videos
    } catch (e) {
      console.error('Failed to get all scenes:', e)
      throw e
    }
  })

  handle('stitchVideos', async (scenes, outputPath, aspectRatio, fps) => {
    await stitchVideos(scenes, outputPath, aspectRatio, fps)
  })

  handle('exportToFcpXml', async (scenes, prompt, outputFilename) => {
    const outputDir = path.join(process.cwd(), 'output-videos')
    await fs.mkdir(outputDir, { recursive: true })
    const finalJsonPath = path.join(outputDir, `${outputFilename}.json`)
    const finalXmlPath = path.join(outputDir, `${outputFilename}`)

    await fs.writeFile(finalJsonPath, JSON.stringify({ scenes, prompt }, null, 2))

    await exportToFcpXml(finalJsonPath, finalXmlPath)
  })
  handle('generateSearchSuggestions', (metadata) => {
    try {
      const suggestions = generateSearchSuggestions(metadata)
      return suggestions
    } catch (error) {
      console.error('Error in generate-search-suggestions handler:', error)
      throw error
    }
  })

  handle('openFile', async (filename: string) => {
    try {
      const outputPath = path.join(process.cwd(), 'output-videos', filename)

      if (!existsSync(outputPath)) {
        throw new Error(`File not found: ${outputPath}`)
      }

      await shell.openPath(outputPath)
      return { success: true }
    } catch (error) {
      console.error('Error opening file:', error)
      throw error
    }
  })

  handle('showInFolder', (filename: string) => {
    try {
      const outputPath = path.join(process.cwd(), 'output-videos', filename)

      if (!existsSync(outputPath)) {
        throw new Error(`File not found: ${outputPath}`)
      }

      shell.showItemInFolder(outputPath)
      return { success: true }
    } catch (error) {
      console.error('Error showing in folder:', error)
      throw error
    }
  })

  handle('getSettings', async () => {
    const settingsPath = path.join(process.cwd(), 'settings.json')
    if (existsSync(settingsPath)) {
      const settings = await fs.readFile(settingsPath, 'utf-8')
      return JSON.parse(settings)
    }
    return {}
  })

  handle('getLocationName', async (location) => {
    const displayName = await getLocationName(location)
    return displayName
  })

  handle('saveSettings', async (settings) => {
    const settingsPath = path.join(process.cwd(), 'settings.json')
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return { success: true }
  })

  handle('getKnownFaces', async () => {
    const facesPath = path.join(process.cwd(), '.faces.json')
    if (existsSync(facesPath)) {
      const faces = await fs.readFile(facesPath, 'utf-8')
      return JSON.parse(faces)
    }
    return {}
  })

  handle('getUnknownFaces', async () => {
    const unknownFacesDir = path.join(process.cwd(), 'analysis_results', 'unknown_faces')
    if (!existsSync(unknownFacesDir)) {
      return []
    }

    const files = await fs.readdir(unknownFacesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const faces = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(unknownFacesDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(content)
      })
    )

    return faces
  })

  handle('deleteUnknownFace', async (imageFile, jsonFile) => {
    const unknownFacesDir = path.join(process.cwd(), 'analysis_results', 'unknown_faces')
    const imagePath = path.join(unknownFacesDir, imageFile)
    const jsonPath = path.join(unknownFacesDir, jsonFile)

    try {
      if (existsSync(imagePath)) {
        await fs.unlink(imagePath)
      }
      if (existsSync(jsonPath)) {
        await fs.unlink(jsonPath)
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting unknown face:', error)
      return { success: false }
    }
  })

  handle('labelUnknownFace', async (jsonFile, faceId, name) => {
    const unknownFacesDir = path.join(process.cwd(), 'analysis_results', 'unknown_faces')
    const jsonPath = path.join(unknownFacesDir, jsonFile)

    try {
      const faceData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
      const imageFile = faceData.image_file
      const imagePath = path.join(unknownFacesDir, imageFile)

      const facesDir = path.join(process.cwd(), '.faces')
      const personDir = path.join(facesDir, name)
      if (!existsSync(personDir)) {
        await fs.mkdir(personDir, { recursive: true })
      }

      const scenes: Scene[] = await getByVideoSource(faceData.video_path)

      const modifiedScenes = scenes
        .map((scene) => {
          if (
            scene.startTime >= faceData.frame_start_time_ms / 1000 &&
            scene.endTime <= faceData.frame_end_time_ms / 1000
          ) {
            if (scene.faces.includes(name)) {
              scene.faces = scene.faces.map((face) => (face === faceId ? name : face))
              return scene
            }
          }
          return undefined
        })
        .filter((scene) => scene != undefined)

      for (const scene of modifiedScenes) {
        await updateMetadata(scene)
      }
      const newImagePath = path.join(personDir, imageFile)
      await fs.rename(imagePath, newImagePath)

      const facesJsonPath = path.join(process.cwd(), '.faces.json')
      let faces = {}
      if (existsSync(facesJsonPath)) {
        faces = JSON.parse(await fs.readFile(facesJsonPath, 'utf-8'))
      }

      if (!faces[name]) {
        faces[name] = []
      }
      faces[name].push(path.join(path.basename(FACES_DIR), name, path.basename(newImagePath)))

      await fs.writeFile(facesJsonPath, JSON.stringify(faces, null, 2))

      return { success: true }
    } catch {
      return { success: false }
    }
  })

  handle('reindexAllFaces', async (jsonFile, faceId, name) => {
    const unknownFacesDir = path.join(process.cwd(), 'analysis_results', 'unknown_faces')

    try {
      const jsonPath = path.join(unknownFacesDir, jsonFile)

      try {
        await fs.unlink(jsonPath)
      } catch (error) {
        console.error(error)
      }

      return new Promise<{ success: boolean }>((resolve, reject) => {
        pythonService.reindexFaces(
          (_progress) => {
            console.log(_progress)
          },
          (_result) => {
            resolve({ success: true })
          },
          (error) => {
            console.error(error)
            reject({ success: false })
          }
        )
      })

      return { success: true }
    } catch (error) {
      console.error('Error reindexing all faces:', error)
      return { success: false }
    }
  })

  handle('startIndexing', async (videos) => {
    const videoToEmbed = await filterExistingVideos(videos)
    for (const video of videoToEmbed) {
      const thumbnailName = `${path.basename(video)}.jpg`
      const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName)
      const thumbnailUrl = `thumbnail://${thumbnailName}`

      if (!existsSync(path.resolve(PROCESSED_VIDEOS_DIR))) {
        mkdirSync(path.resolve(PROCESSED_VIDEOS_DIR))
      }

      const videoName = path.basename(video)
      const videoDir = path.join(PROCESSED_VIDEOS_DIR, videoName)
      if (!existsSync(videoDir)) {
        mkdirSync(path.resolve(videoDir))
      }

      const transcriptionPath = path.join(videoDir, 'transcription.json')
      const analysisPath = path.join(videoDir, 'analysis.json')
      const scenesPath = path.join(videoDir, 'scenes.json')

      const transcriptionExists = existsSync(transcriptionPath)
      const analysisExists = existsSync(analysisPath)
      const scenesExists = existsSync(scenesPath)

      try {
        await generateThumbnail(video, thumbnailPath, 1)

        if (transcriptionExists && analysisExists && scenesExists) {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'transcription',
            success: true,
            stepIndex: 0,
            thumbnailUrl,
          })
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'frame-analysis',
            success: true,
            stepIndex: 1,
            thumbnailUrl,
          })
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'embedding',
            success: true,
            stepIndex: 2,
            thumbnailUrl,
          })
          continue
        }

        // Case 2: All files exist but need embedding
        if (transcriptionExists && analysisExists && scenesExists) {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'transcription',
            success: true,
            stepIndex: 0,
            thumbnailUrl,
          })
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'frame-analysis',
            success: true,
            stepIndex: 1,
            thumbnailUrl,
          })

          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'embedding',
              success: true,
              stepIndex: 2,
              thumbnailUrl,
            })

            const [scenes, { category }] = await Promise.all([
              fs.readFile(scenesPath, 'utf-8').then(JSON.parse),
              fs.readFile(analysisPath, 'utf-8').then(JSON.parse),
            ])

            await embedScenes(scenes, video, category)

            send('indexing-progress', {
              video,
              progress: 100,
              step: 'embedding',
              success: true,
              stepIndex: 2,
              thumbnailUrl,
            })
          } catch (error) {
            console.error('Error during embedding:', error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'embedding',
              success: false,
              stepIndex: 2,
              thumbnailUrl,
            })
          }
          continue // Important: skip to next video after embedding
        }

        // Step 1: Transcription
        if (!transcriptionExists) {
          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'transcription',
              success: true,
              stepIndex: 0,
              thumbnailUrl,
            })

            await transcribeAudio(video, transcriptionPath, ({ progress, elapsed }) => {
              send('indexing-progress', {
                video,
                progress,
                step: 'transcription',
                success: true,
                stepIndex: 0,
                thumbnailUrl,
                elapsed: convertTimeToWords(elapsed),
              })
            })

            send('indexing-progress', {
              video,
              progress: 100,
              step: 'transcription',
              success: true,
              stepIndex: 0,
              thumbnailUrl,
            })
          } catch (error) {
            console.error('Error during transcription:', error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'transcription',
              success: false,
              stepIndex: 0,
              thumbnailUrl,
            })
            continue
          }
        } else {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'transcription',
            success: true,
            stepIndex: 0,
            thumbnailUrl,
          })
        }

        // Step 2: Frame Analysis
        if (!analysisExists) {
          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'frame-analysis',
              success: true,
              stepIndex: 1,
              thumbnailUrl,
            })

            const { analysis, category } = await new Promise<{ analysis: any; category: string }>((resolve, reject) => {
              analyzeVideo(
                video,
                ({ progress, elapsed, frames_analyzed, total_frames }) => {
                  send('indexing-progress', {
                    video,
                    progress: progress,
                    step: 'frame-analysis',
                    success: true,
                    stepIndex: 1,
                    thumbnailUrl,
                    elapsed: convertTimeToWords(elapsed),
                    totalFrames: total_frames,
                    framesProcessed: frames_analyzed,
                  })
                },
                (result) => resolve(result),
                (error) => reject(error)
              )
            })

            await fs.writeFile(analysisPath, JSON.stringify({ analysis, category }, null, 2))

            send('indexing-progress', {
              video,
              progress: 100,
              step: 'frame-analysis',
              success: true,
              stepIndex: 1,
              thumbnailUrl,
            })
          } catch (error) {
            console.error('Error during frame analysis:', error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'frame-analysis',
              success: false,
              stepIndex: 1,
              thumbnailUrl,
            })
            continue
          }
        } else {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'frame-analysis',
            success: true,
            stepIndex: 1,
            thumbnailUrl,
          })
        }

        // Step 3: Embedding
        try {
          send('indexing-progress', {
            video,
            progress: 0,
            step: 'embedding',
            success: true,
            stepIndex: 2,
            thumbnailUrl,
          })

          const [transcriptionData, { analysis, category }] = await Promise.all([
            fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse),
            fs.readFile(analysisPath, 'utf-8').then(JSON.parse),
          ])

          let scenes: Scene[]
          if (!scenesExists) {
            scenes = await createScenes(analysis, transcriptionData, video)
            await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
          } else {
            scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)
          }

          await embedScenes(scenes, video, category)

          send('indexing-progress', {
            video,
            progress: 100,
            step: 'embedding',
            success: true,
            stepIndex: 2,
            thumbnailUrl,
          })
        } catch (error) {
          console.error('Error during embedding:', error)
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'embedding',
            success: false,
            stepIndex: 2,
            thumbnailUrl,
          })
          continue
        }
      } catch (error) {
        console.error('Error during thumbnail generation or setup:', error)
        send('indexing-progress', {
          video,
          progress: 0,
          step: 'transcription',
          success: false,
          stepIndex: 0,
          thumbnailUrl,
        })
        continue
      }
    }
  })
}
