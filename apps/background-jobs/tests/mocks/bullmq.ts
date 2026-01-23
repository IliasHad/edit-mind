import { JobsOptions, Job } from 'bullmq'

type JobData = Record<string, string | Record<string, string> | Record<string, string>[]>
/**
 * Create a proper BullMQ Job object from minimal data
 */
function createBullMQJob(id: string, name: string, data: JobData, queueName: string): Job {
  const job = {
    id,
    name,
    data,
    opts: {},
    progress: 0,
    delay: 0,
    timestamp: Date.now(),
    attemptsMade: 0,
    stacktrace: [],
    returnvalue: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    queueQualifiedName: `bull:${queueName}`,
    parent: null,
    parentKey: null,
    lockDuration: 0,
    lockRenewTime: 0,
    waitChildrenKey: null,
    nextProcessAt: 0,
  }

  return job as unknown as Job
}

/**
 * Mock implementation of Bull MQ Queue for testing
 * Tracks jobs in memory without requiring Redis
 */
export class MockQueue {
  private jobs: Map<string, MockJob> = new Map()
  private jobCounter = 0
  public name: string

  constructor(name: string) {
    this.name = name
  }

  /**
   * Add a job to the queue
   */
  async add(jobName: string, data: JobData, options?: JobsOptions): Promise<Job> {
    const jobId = `${this.name}-job-${++this.jobCounter}`
    const job: MockJob = {
      id: jobId,
      name: jobName,
      data,
      opts: options,
      finishedOn: undefined,
      processedOn: undefined,
      failedReason: undefined,
      stacktrace: undefined,
    }
    this.jobs.set(jobId, job)
    return createBullMQJob(jobId, jobName, data, this.name)
  }

  /**
   * Get all active jobs (currently being processed)
   */
  async getActive(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.processedOn && !job.finishedOn)
      .map((job) => createBullMQJob(job.id, job.name, job.data, this.name))
  }

  /**
   * Get all waiting jobs (queued but not started)
   */
  async getWaiting(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => !job.processedOn && !job.finishedOn)
      .map((job) => createBullMQJob(job.id, job.name, job.data, this.name))
  }

  /**
   * Get all delayed jobs
   */
  async getDelayed(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.opts?.delay)
      .map((job) => createBullMQJob(job.id, job.name, job.data, this.name))
  }

  /**
   * Get all failed jobs
   */
  async getFailed(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.failedReason)
      .map((job) => createBullMQJob(job.id, job.name, job.data, this.name))
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    const job = this.jobs.get(jobId)
    return job ? createBullMQJob(job.id, job.name, job.data, this.name) : undefined
  }

  /**
   * Remove a job from the queue
   */
  async remove(jobId: string): Promise<number> {
    const existed = this.jobs.has(jobId)
    this.jobs.delete(jobId)
    return existed ? 1 : 0
  }

  /**
   * Clear all jobs from the queue
   */
  async clear(): Promise<void> {
    this.jobs.clear()
    this.jobCounter = 0
  }

  /**
   * Get all jobs (for testing/inspection)
   */
  getJobs(): MockJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get job by ID (for testing/inspection)
   */
  getJobById(jobId: string): MockJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get count of jobs
   */
  getJobCount(): number {
    return this.jobs.size
  }

  /**
   * Mark a job as processed (for testing)
   */
  markAsProcessed(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.processedOn = Date.now()
    }
  }

  /**
   * Mark a job as finished (for testing)
   */
  markAsFinished(jobId: string, result?: Record<string, string>): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.finishedOn = Date.now()
      job.returnvalue = result
    }
  }

  /**
   * Mark a job as failed (for testing)
   */
  markAsFailed(jobId: string, reason: string, stacktrace?: string): void {
    const job = this.jobs.get(jobId)
    if (job) {
      job.failedReason = reason
      job.stacktrace = stacktrace
    }
  }
}

/**
 * Mock Job interface
 */
export interface MockJob {
  id: string
  name: string
  data: JobData
  opts?: JobsOptions
  finishedOn?: number
  processedOn?: number
  failedReason?: string
  stacktrace?: string
  returnvalue?: Record<string, string>
}

/**
 * Create a mock queue factory
 */
export function createMockQueue(name: string): MockQueue {
  return new MockQueue(name)
}

/**
 * Helper function to create a mock BullMQ Job for testing
 */
export function createMockJob(id: string, name: string, data: JobData = {}): Job {
  return createBullMQJob(id, name, data, 'test')
}

/**
 * Mock Bull MQ module
 */
export const mockBullMQ = {
  Queue: MockQueue,
}
