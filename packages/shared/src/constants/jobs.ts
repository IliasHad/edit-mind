import type { JobStage } from "@prisma/client";

export const JOB_STAGE_CANCELLABLE: JobStage[] = ["transcribing", "frame_analysis", "starting"]