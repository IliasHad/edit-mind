-- Add irrecoverable status for jobs that cannot be retried (e.g. unsupported codec)
ALTER TYPE "JobStatus" ADD VALUE 'irrecoverable';

-- Store the human-readable reason why a job became irrecoverable
ALTER TABLE "Job" ADD COLUMN "failureReason" TEXT;
