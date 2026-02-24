import { logger } from "@shared/services/logger";
import { isGPUAvailable } from "@shared/utils/gpu";

export let USE_GPU = false;

(async function initGPU(): Promise<void> {
    try {
        USE_GPU = await isGPUAvailable();
    } catch (error) {
        logger.error({ error }, 'Failed to initialize GPU — defaulting to CPU');
    }
})()