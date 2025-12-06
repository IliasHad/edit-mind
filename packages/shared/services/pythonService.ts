import 'dotenv/config'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import WebSocket from 'ws'
import { Analysis, AnalysisProgress } from '../types/analysis'
import { IS_WIN, MAX_RESTARTS, PYTHON_PORT, PYTHON_SCRIPT, RESTART_BACKOFF_MS, VENV_PATH } from '../constants'
import { FaceIndexingProgress, FaceMatchingProgress, FindMatchingFacesResponse } from '../types/face'
import { TranscriptionProgress } from '../types/transcription'
import { logger } from './logger'
import { CallbackMap, PythonMessageType } from '../types/python'

class PythonService {
  private static instance: PythonService
  private serviceProcess: ChildProcess | null = null
  private client: WebSocket | null = null
  private serviceUrl: string
  private isRunning = false
  private restartCount = 0
  private messageCallbacks: CallbackMap = {}
  private port: string
  private startPromise: Promise<string> | null = null

  private constructor() {
    if (!PYTHON_PORT) {
      throw new Error('PYTHON_PORT is not defined in the environment variables.')
    }
    this.port = PYTHON_PORT
    const host = process.env.PYTHON_HOST || 'localhost'
    this.serviceUrl = `ws://${host}:${this.port}`
  }

  public static getInstance(): PythonService {
    if (!PythonService.instance) {
      PythonService.instance = new PythonService()
    }
    return PythonService.instance
  }

  public async start(): Promise<string> {
    if (this.startPromise) {
      logger.debug('Python service already starting, waiting...')
      return this.startPromise
    }

    if (this.isRunning && this.client && this.client.readyState === WebSocket.OPEN) {
      logger.debug('Python service already connected, reusing connection')
      return this.serviceUrl
    }

    this.startPromise = this._doStart()

    try {
      return await this.startPromise
    } finally {
      this.startPromise = null
    }
  }

  private async _doStart(): Promise<string> {
    try {
      logger.debug('Attempting to connect to existing Python service...')
      if (this.client) {
        this.client.removeAllListeners()
        this.client.close()
        this.client = null
      }
      await this.connectToWebSocket()
      this.isRunning = true
      logger.debug('✅ Connected to existing Python service')
      return this.serviceUrl
    } catch {
      logger.debug('No existing service found, spawning new one...')
    }

    const venvPath = VENV_PATH
    const pythonExecutable = IS_WIN
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python')

    const servicePath = PYTHON_SCRIPT

    logger.debug(`Spawning Python service: ${pythonExecutable} ${servicePath}`)

    this.serviceProcess = spawn(pythonExecutable, [servicePath, '--port', this.port, '--host', '0.0.0.0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    if (!this.serviceProcess || !this.serviceProcess.pid) {
      throw new Error('Failed to spawn Python service process')
    }

    logger.debug(`Python service spawned with PID: ${this.serviceProcess.pid}`)

    this.serviceProcess.stdout?.on('data', (data) => {
      logger.debug(`[PythonService STDOUT]: ${data.toString().trim()}`)
    })

    this.serviceProcess.stderr?.on('data', (data) => {
      logger.debug(`[PythonService STDERR]: ${data.toString().trim()}`)
    })

    this.serviceProcess.on('error', (error) => {
      logger.error('Python service process error: ' + error)
    })

    this.serviceProcess.on('exit', (code, signal) => {
      logger.error(`Python service exited with code ${code}, signal ${signal}`)
      this.isRunning = false
      this.serviceProcess = null
      this.handleCrash()
    })

    logger.debug('Waiting for Python service to be ready...')
    const maxAttempts = 15
    const delayMs = 1000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`Connection attempt ${attempt}/${maxAttempts}...`)
        await this.connectToWebSocket()
        this.isRunning = true
        this.restartCount = 0
        logger.debug('✅ Connected to the Python service')
        return this.serviceUrl
      } catch (error) {
        if (attempt === maxAttempts) {
          logger.error('Failed to connect to Python service after max attempts')
          this.stop()
          logger.error(error)
          throw new Error(`Python service failed to start within ${maxAttempts * delayMs}ms`)
        }
        logger.debug(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    throw new Error('Failed to start Python service')
  }

  public async stop(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners()
      this.client.close()
      this.client = null
    }
    if (this.serviceProcess) {
      this.serviceProcess.removeAllListeners()
      this.serviceProcess.kill('SIGTERM')
      this.serviceProcess = null
    }
    this.isRunning = false
  }

  public analyzeVideo(
    videoPath: string,
    job_id: string,
    onProgress: (progress: AnalysisProgress) => void,
    onResult: (result: Analysis) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks['analysis_progress'] = onProgress
    this.messageCallbacks['analysis_completed'] = onResult
    this.messageCallbacks['analysis_error'] = onError

    const message = {
      type: 'analyze',
      payload: { video_path: videoPath, job_id },
    }

    this.client.send(JSON.stringify(message))
  }

  public async transcribe(
    videoPath: string,
    jsonFilePath: string,
    job_id: string,
    onProgress: (progress: TranscriptionProgress) => void,
    onComplete: (result: void) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks['transcription_progress'] = onProgress
    this.messageCallbacks['transcription_completed'] = onComplete
    this.messageCallbacks['transcription_error'] = onError

    const message = {
      type: 'transcribe',
      payload: { video_path: videoPath, json_file_path: jsonFilePath, job_id },
    }

    this.client.send(JSON.stringify(message))
  }

  public reindexFaces(
    specificFaces: { name: string; image_path: string }[],
    jobId: string,
    onProgress: (progress: FaceIndexingProgress) => void,
    onComplete: (result: void) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    this.messageCallbacks['reindex_progress'] = onProgress
    this.messageCallbacks['reindex_complete'] = onComplete
    this.messageCallbacks['reindex_error'] = onError

    const message = {
      type: 'reindex_faces',
      specific_faces: specificFaces,
      job_id: jobId,
    }

    this.client.send(JSON.stringify(message))
  }
  public findMatchingFaces(
    personName: string,
    referenceImages: string[],
    unknownFacesDir: string,
    onProgress: (progress: FaceMatchingProgress) => void,
    onComplete: (result: FindMatchingFacesResponse) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks['face_matching_progress'] = onProgress
    this.messageCallbacks['face_matching_complete'] = onComplete
    this.messageCallbacks['face_matching_error'] = onError
    const message = {
      type: 'find_matching_faces',
      payload: {
        person_name: personName,
        reference_images: referenceImages,
        unknown_faces_dir: unknownFacesDir,
        tolerance: 0.4,
      },
    }

    this.client.send(JSON.stringify(message))
  }
  public getServiceUrl(): string {
    return this.serviceUrl
  }

  public isServiceRunning(): boolean {
    return this.isRunning
  }

  private connectToWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.client) {
          this.client.terminate()
          this.client = null
        }
        reject(new Error('WebSocket connection timeout'))
      }, 10000) // Increased timeout for slow starts

      this.client = new WebSocket(this.serviceUrl)

      this.client.on('open', () => {
        clearTimeout(timeout)
        logger.debug('✅ WebSocket connection established.')
        resolve()
      })

      this.client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const { type, payload, job_id } = message

          // Handle ping/pong heartbeat from Python service
          if (type === 'ping') {
            this.client?.send(JSON.stringify({ type: 'pong' }))
            return
          }

          const callback = this.messageCallbacks[type as PythonMessageType]

          if (callback) {
            callback({ ...payload, job_id })
          } else if (type !== 'pong') {
            logger.warn(`⚠️ No callback registered for message type: ${type}`)
          }
        } catch (error) {
          logger.error('❌ Error processing message: ' + error)
        }
      })

      this.client.on('error', (error) => {
        clearTimeout(timeout)
        logger.error({ error }, 'WebSocket error')
        this.client = null
        reject(error)
      })

      this.client.on('close', (code, reason) => {
        clearTimeout(timeout)
        logger.warn(`WebSocket closed: code=${code}, reason=${reason?.toString() || 'none'}`)
        this.client = null
        this.isRunning = false
        // Auto-reconnect after unexpected close
        if (code !== 1000) {
          logger.info('Attempting auto-reconnect in 2 seconds...')
          setTimeout(() => {
            this.start().catch((err) => logger.error('Auto-reconnect failed:', err))
          }, 2000)
        }
      })
    })
  }

  // Ensure connection is alive, reconnect if needed
  public async ensureConnected(): Promise<boolean> {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      return true
    }
    try {
      await this.start()
      return true
    } catch (error) {
      logger.error({ error }, 'Failed to ensure connection')
      return false
    }
  }

  private handleCrash() {
    if (this.restartCount < MAX_RESTARTS) {
      this.restartCount++
      const delay = this.restartCount * RESTART_BACKOFF_MS
      setTimeout(() => this.start().catch((err) => logger.error('Restart failed:', err)), delay)
    } else {
      logger.error('Python service has crashed too many times. Will not restart.')
    }
  }
}

export const pythonService = PythonService.getInstance()
