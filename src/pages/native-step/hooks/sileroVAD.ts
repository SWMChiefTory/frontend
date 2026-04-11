/**
 * sileroVAD – Silero Voice Activity Detection (v4)
 *
 * ONNX Runtime으로 Silero VAD v4 모델을 로드하여
 * 실시간 음성 감지를 수행.
 *
 * v4 모델 입력: input[1,512], sr(int64), h[2,1,64], c[2,1,64]
 * v4 모델 출력: output[1,1], hn[2,1,64], cn[2,1,64]
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';

export const SAMPLE_RATE = 16000;
export const WINDOW_SIZE = 512; // Silero VAD v4: 512 samples = 32ms @ 16kHz

export type SileroVADInstance = {
  process: (frame: Float32Array) => Promise<number>;
  reset: () => void;
  dispose: () => void;
}

export async function createSileroVAD(): Promise<SileroVADInstance> {
  const asset = Asset.fromModule(require('../../../../assets/models/silero_vad.onnx'));
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('Failed to download Silero VAD model');
  }

  // Release 빌드에서 localUri가 URL 인코딩됨 (Application%20Support → Application Support)
  const modelPath = decodeURIComponent(asset.localUri.replace('file://', ''));

  // CPU EP 강제 — CoreML/NNAPI의 LSTM 호환성 문제 회피
  const session = await InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
  });
  console.log('[SileroVAD] v4 loaded, inputs:', session.inputNames, 'outputs:', session.outputNames);

  const batchSize = 1;
  const numLayers = 2;
  const hiddenSize = 64;

  let h = new Float32Array(numLayers * batchSize * hiddenSize);
  let c = new Float32Array(numLayers * batchSize * hiddenSize);

  const sr = new BigInt64Array([BigInt(SAMPLE_RATE)]);

  const process = async (frame: Float32Array): Promise<number> => {
    const inputTensor = new Tensor('float32', frame, [1, frame.length]);
    const srTensor = new Tensor('int64', sr, []);
    const hTensor = new Tensor('float32', h, [numLayers, batchSize, hiddenSize]);
    const cTensor = new Tensor('float32', c, [numLayers, batchSize, hiddenSize]);

    const result = await session.run({
      input: inputTensor,
      sr: srTensor,
      h: hTensor,
      c: cTensor,
    });

    h = new Float32Array(result.hn.data as Float32Array);
    c = new Float32Array(result.cn.data as Float32Array);

    const output = result.output.data as Float32Array;
    return output[0];
  };

  const reset = () => {
    h = new Float32Array(numLayers * batchSize * hiddenSize);
    c = new Float32Array(numLayers * batchSize * hiddenSize);
  };

  const dispose = () => {
    session.release();
  };

  return { process, reset, dispose };
}
