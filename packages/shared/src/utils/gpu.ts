import { logger } from '@shared/services/logger';

let _gpuAvailable: boolean | null = null;

export async function isGPUAvailable(): Promise<boolean> {
  if (_gpuAvailable !== null) return _gpuAvailable;

  try {
    const ort = await import('onnxruntime-node');
    const providers: string[] = ort.InferenceSession.availableProviders ?? [];
    _gpuAvailable = providers.includes('CUDAExecutionProvider');
    logger.info(_gpuAvailable ? 'GPU available (CUDA)' : 'GPU unavailable — fallback to CPU');
  } catch {
    _gpuAvailable = false;
    logger.info('GPU unavailable — fallback to CPU');
  }
  return _gpuAvailable;
}