import 'dotenv/config'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import WebSocket from 'ws'
import { Analysis, AnalysisProgress } from '../types/analysis'
import { IS_WIN, MAX_RESTARTS, PYTHON_PORT, PYTHON_SCRIPT, RESTART_BACKOFF_MS, VENV_PATH } from '../constants'
import { TranscriptionProgress } from '../types/transcription'
import { logger } from './logger'
import { PythonMessageType } from '../types/python'

interface JobCallbacks {
  onProgress?: (data: any) => void
  onResult?: (data: any) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

class PythonService {
  private static instance: PythonService
  private serviceProcess: ChildProcess | null = null
  private client: WebSocket | null = null
  private serviceUrl: string
  private isRunning = false
  private restartCount = 0
  private jobCallbacks: Map<string, JobCallbacks> = new Map()
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

    this.serviceProcess = spawn(pythonExecutable, [servicePath, '--port', this.port, '--host', '0.0.0.0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    if (!this.serviceProcess || !this.serviceProcess.pid) {
      throw new Error('Failed to spawn Python service process')
    }

    this.serviceProcess.on('error', (error) => {
      logger.error('Python service process error: ' + error)
    })

    this.serviceProcess.on('exit', (code, signal) => {
      logger.error(`Python service exited with code ${code}, signal ${signal}`)
      this.isRunning = false
      this.serviceProcess = null
      this.handleCrash()
    })

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
    this.jobCallbacks.clear()
    this.isRunning = false
  }

  public analyzeVideo(
    videoPath: string,
    job_id: string,
    onProgress: (progress: AnalysisProgress) => void,
    onResult: (result: Analysis) => void,
    onError: (error: Error) => void
  ): void {
    if (this.client?.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client?.readyState}`))
      return
    }

    this.jobCallbacks.set(job_id, {
      onProgress,
      onResult,
      onError,
    })

    const message = {
      type: 'analyze',
      payload: { video_path: encodeURI(videoPath), job_id },
    }

    try {
      this.client.send(JSON.stringify(message))
    } catch (error) {
      this.jobCallbacks.delete(job_id)
      onError(new Error(`Failed to send message: ${error}`))
    }
  }

  public transcribe(
    videoPath: string,
    jsonFilePath: string,
    job_id: string,
    onProgress: (progress: TranscriptionProgress) => void,
    onComplete: (result: void) => void,
    onError: (error: Error) => void
  ): void {
    if (this.client?.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client?.readyState}`))
      return
    }

    this.jobCallbacks.set(job_id, {
      onProgress,
      onComplete,
      onError,
    })

    const message = {
      type: 'transcribe',
      payload: { video_path: encodeURI(videoPath), json_file_path: jsonFilePath, job_id },
    }

    try {
      this.client?.send(JSON.stringify(message))
    } catch (error) {
      this.jobCallbacks.delete(job_id)
      onError(new Error(`Failed to send message: ${error}`))
    }
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
      }, 3000)

      this.client = new WebSocket(this.serviceUrl, {
        maxPayload: 1024 * 1024 * 1024, // 1GB
      })

      this.client.on('open', () => {
        clearTimeout(timeout)
        logger.debug('✅ WebSocket connection established.')
        resolve()
      })

      this.client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const { type, payload } = message
          const job_id = payload?.job_id

          if (!job_id) {
            logger.warn(`⚠️ Received message without job_id: ${type}`)
            return
          }

          const callbacks = this.jobCallbacks.get(job_id)

          if (!callbacks) {
            logger.warn(`⚠️ No callbacks registered for job_id: ${job_id}`)
            return
          }

          switch (type as PythonMessageType) {
            case 'analysis_progress':
              callbacks.onProgress?.(payload)
              break

            case 'analysis_completed':
              callbacks.onResult?.(payload)
              this.jobCallbacks.delete(job_id)
              break

            case 'analysis_error':
              callbacks.onError?.(new Error(payload.message || 'Analysis failed'))
              this.jobCallbacks.delete(job_id)
              break

            case 'transcription_progress':
              callbacks.onProgress?.(payload)
              break

            case 'transcription_completed':
              callbacks.onComplete?.()
              this.jobCallbacks.delete(job_id)
              break

            case 'transcription_error':
              callbacks.onError?.(new Error(payload.message || 'Transcription failed'))
              this.jobCallbacks.delete(job_id)
              break

            default:
              logger.warn(`⚠️ Unknown message type: ${type}`)
          }
        } catch (error) {
          logger.error('❌ Error processing message: ' + error)
        }
      })

      this.client.on('error', (error) => {
        clearTimeout(timeout)
        this.client = null
        reject(error)
      })

      this.client.on('close', () => {
        clearTimeout(timeout)
        this.client = null
        this.isRunning = false
      })
    })
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
