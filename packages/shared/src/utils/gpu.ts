import { execSync } from 'child_process';

export function isGPUAvailable(): boolean {
  try {
    // Check if nvidia-smi is available
    execSync('nvidia-smi', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}