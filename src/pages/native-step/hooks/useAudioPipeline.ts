/**
 * useAudioPipeline – 타입 정의
 *
 * 네이티브 음성 파이프라인의 공통 타입.
 * useWebAudioPipeline, useVoiceCommandWeb 등에서 사용.
 */

export type PipelineState = 'IDLE' | 'LISTENING' | 'TRANSCRIBING';

export interface AudioPipelineResult {
  state: PipelineState;
  start: () => Promise<void>;
  stop: () => void;
  resetTranscription: () => void;
  error: string | null;
}
