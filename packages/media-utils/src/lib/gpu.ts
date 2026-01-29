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

export function checkFFmpegGPUSupport(): boolean {
  try {
    const output = execSync('ffmpeg -hwaccels 2>&1', { encoding: 'utf-8' });
    return output.includes('cuda') || output.includes('nvdec');
  } catch {
    return false;
  }
}