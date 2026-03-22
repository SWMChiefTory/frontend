/**
 * sileroVAD – Silero Voice Activity Detection
 *
 * ONNX Runtime으로 Silero VAD 모델을 로드하여
 * 실시간 음성 감지를 수행.
 */

import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';

export const SAMPLE_RATE = 16000;
export const WINDOW_SIZE = 1536; // Silero VAD v5 window size

export interface SileroVADInstance {
  /** 음성 확률을 반환 (0~1). frame은 WINDOW_SIZE 길이의 Float32Array */
  process: (frame: Float32Array) => Promise<number>;
  /** 내부 상태 초기화 (새 utterance 시작 시) */
  reset: () => void;
  /** 모델 리소스 해제 */
  dispose: () => void;
}

export async function createSileroVAD(): Promise<SileroVADInstance> {
  // ONNX 모델 로드
  const asset = Asset.fromModule(require('../../../../assets/models/silero_vad.onnx'));
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('Failed to download Silero VAD model');
  }

  const session = await InferenceSession.create(asset.localUri);

  // Silero VAD 내부 상태 (h, c for LSTM)
  const batchSize = 1;
  const numLayers = 2; // Silero VAD v5
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

    // 상태 업데이트
    h = new Float32Array(result.hn.data as Float32Array);
    c = new Float32Array(result.cn.data as Float32Array);

    // 음성 확률
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
