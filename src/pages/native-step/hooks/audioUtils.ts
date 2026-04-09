/**
 * audioUtils – base64 PCM ↔ Float32 변환 유틸
 *
 * 웹뷰 bridge에서 받은 base64 Int16 PCM 청크를
 * VAD/STT 파이프라인이 사용하는 Float32Array로 변환.
 */

/**
 * base64로 인코딩된 Int16 PCM → Float32Array [-1, 1]
 * 웹 worklet이 16kHz mono Int16으로 보냄.
 */
export function base64PcmToFloat32(base64: string): Float32Array {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  // Uint8 → Int16 (little-endian)
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}
