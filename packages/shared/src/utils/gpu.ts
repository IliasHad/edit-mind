import { execSync } from 'child_process';
import { logger } from '@shared/services/logger';

let _gpuAvailable: boolean | null = null;

export async function isGPUAvailable(): Promise<boolean> {
  if (_gpuAvailable !== null) return _gpuAvailable;

  try {
    execSync('nvidia-smi', { stdio: 'ignore', timeout: 5000 });
    _gpuAvailable = true;
    logger.info('GPU available (CUDA)');
  } catch {
    _gpuAvailable = false;
    logger.info('GPU unavailable — fallback to CPU');
  }
  return _gpuAvailable;
}