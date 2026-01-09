import { ChildProcess } from 'child_process'
import WebSocket from 'ws'
import { ML_HOST, ML_PORT } from '../constants'
import { logger } from './logger'
import { Analysis, AnalysisProgress } from '@shared/types/analysis'
import { Transcription, TranscriptionProgress } from '@shared/types/transcription'

interface JobCallbacks<T = Analysis | Transcription> {
  onProgress?: (progress: TranscriptionProgress | AnalysisProgress) => void
  onError?: (error: Error) => void
  onComplete?: (data: T) => void
}

class PythonService {
  private static instance: PythonService
  private serviceProcess: ChildProcess | null = null
  private client: WebSocket | null = null
  private serviceUrl: string
  private isRunning = false
  private jobCallbacks: Map<string, JobCallbacks> = new Map()
  private startPromise: Promise<string> | null = null

  // TODO: We need to implement session for this websocket,
  // in case the Node.js service has been restarted and ML service is still processing a job, we'll lost the connection

  private constructor() {
    if (!ML_PORT) {
      throw new Error('ML_PORT is not defined in the environment variables.')
    }
    this.serviceUrl = `ws://${ML_HOST}:${ML_PORT}`
    logger.debug(`Connecting to ${this.serviceUrl}`)
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
    const maxRetries = 30
    const retryDelay = 2000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempting to connect to ML service (attempt ${attempt}/${maxRetries})...`)
        if (this.client) {
          this.client.removeAllListeners()
          this.client.close()
          this.client = null
        }
        await this.connectToWebSocket()
        this.isRunning = true
        logger.debug('Connected to ML service')
        return this.serviceUrl
      } catch (error) {
        logger.debug(`Connection attempt ${attempt} failed: ${error}`)
        if (attempt < maxRetries) {
          logger.debug(`Retrying in ${retryDelay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
      }
    }

    throw new Error('Failed to connect to ML service after maximum retries')
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
    jsonFilePath: string,
    job_id: string,
    onProgress: (progress: AnalysisProgress) => void,
    onComplete: (data: Analysis) => void,
    onError: (error: Error) => void
  ): void {
    if (this.client?.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client?.readyState}`))
      return
    }

    this.jobCallbacks.set(job_id, {
      onProgress: onProgress as (progress: TranscriptionProgress | AnalysisProgress) => void,
      onComplete: onComplete as (data: Analysis | Transcription) => void,
      onError,
    })

    const message = {
      type: 'analyze',
      payload: { video_path: encodeURI(videoPath), job_id, json_file_path: jsonFilePath },
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
    onComplete: (data: Transcription) => void,
    onError: (error: Error) => void
  ): void {
    if (this.client?.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client?.readyState}`))
      return
    }

    this.jobCallbacks.set(job_id, {
      onProgress: onProgress as (progress: TranscriptionProgress | AnalysisProgress) => void,
      onComplete: onComplete as (data: Analysis | Transcription) => void,
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
      }, 5000)

      this.client = new WebSocket(this.serviceUrl, {
        maxPayload: 200 * 1024 * 1024, // 200 MB
      })

      this.client.on('open', () => {
        clearTimeout(timeout)
        logger.debug('WebSocket connection established.')
        resolve()
      })

      this.client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const { type, payload } = message
          const job_id = payload?.job_id

          if (type === 'ping') {
            return
          }

          if (!job_id) {
            logger.warn(`Received message without job_id: ${type}`)
            return
          }

          const callbacks = this.jobCallbacks.get(job_id)

          if (!callbacks) {
            logger.warn(`No callbacks registered for job_id: ${job_id}`)
            throw new Error(`No callbacks registered for job_id: ${job_id}`)
          }

          switch (type) {
            case 'analysis_progress':
              callbacks.onProgress?.(payload)
              break

            case 'analysis_completed':
              callbacks.onComplete?.(payload)
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
              callbacks.onComplete?.(payload)
              this.jobCallbacks.delete(job_id)
              break

            case 'transcription_error':
              callbacks.onError?.(new Error(payload.message || 'Transcription failed'))
              this.jobCallbacks.delete(job_id)
              break

            default:
              logger.warn(`Unknown message type: ${type}`)
          }
        } catch (error) {
          logger.error('Error processing message: ' + error)
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
        logger.warn('WebSocket connection closed')
        // Try again to reconnect to the websocket
        this.start()
      })
    })
  }
}

export const pythonService = PythonService.getInstance()
