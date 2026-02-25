import { logger } from '@shared/services/logger';

let _gpuAvailable: boolean | null = null;

const MINIMAL_ONNX_MODEL = Buffer.from([
  0x08, 0x07, 0x12, 0x00, 0x2a, 0x00, 0x3a, 0x00,
]);

export async function isGPUAvailable(): Promise<boolean> {
  if (_gpuAvailable !== null) return _gpuAvailable;

  try {
    const ort = await import('onnxruntime-node');
    await ort.InferenceSession.create(MINIMAL_ONNX_MODEL, {
      executionProviders: ['CUDAExecutionProvider'],
    });
    _gpuAvailable = true;
    logger.info('GPU available');
  } catch {
    _gpuAvailable = false;
    logger.info('GPU unavailable — fallback to CPU');
  }
  return _gpuAvailable;
}