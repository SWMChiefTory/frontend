/**
 * useWebAudioPipeline – WebView bridge 기반 VAD-gated STT pipeline
 *
 * mode:
 *   'streaming' (iOS + Android on-device): VAD → speech → 실시간 STT 스트리밍
 *   'batch' (Android API33+ fallback): VAD → speech → 0.5초 침묵 → 일괄 전송
 *   'native' (Android API<33): VAD만 수행 → onVoiceStart/End로 네이티브 인식기 트리거
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Share, Platform } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system/next';

let realtimeBufferTranscribe: any = () => {};
let stopBufferTranscription: any = () => {};
let setContextualStrings: any = () => {};
let useRealTimeTranscription: any = () => ({ results: null });
try {
  const speechModule = require('expo-speech-transcriber');
  realtimeBufferTranscribe = speechModule.realtimeBufferTranscribe ?? realtimeBufferTranscribe;
  stopBufferTranscription = speechModule.stopBufferTranscription ?? stopBufferTranscription;
  setContextualStrings = speechModule.setContextualStrings ?? setContextualStrings;
  useRealTimeTranscription = speechModule.useRealTimeTranscription ?? useRealTimeTranscription;
} catch (e) {
  console.warn('[useWebAudioPipeline] expo-speech-transcriber 로드 실패:', e);
}
import { createSileroVAD, type SileroVADInstance, SAMPLE_RATE, WINDOW_SIZE } from './sileroVAD';
import { base64PcmToFloat32 } from './audioUtils';
import type { PipelineState, AudioPipelineResult } from './useAudioPipeline';

// ─── Constants ───
const PRE_BUFFER_SAMPLES = SAMPLE_RATE * 0.5;
const MAX_UTTERANCE_SAMPLES = SAMPLE_RATE * 10;

const SPEECH_THRESHOLD = 0.7;
const SPEECH_FRAMES_TO_ACTIVATE = 3;
const SILENCE_FRAMES_FOR_BATCH = 16; // ~0.5s

// ─── Debug: PCM → WAV 저장 + 공유 ───
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

function createWavHeader(dataLength: number, sampleRate: number): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  return header;
}

async function saveAndShareWav(chunks: Float32Array[], sampleRate: number) {
  if (chunks.length === 0) return;

  // 전체 샘플 합치기
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const merged = new Float32Array(totalLen);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }

  const int16 = float32ToInt16(merged);
  const dataBytes = int16.buffer as ArrayBuffer;
  const header = createWavHeader(dataBytes.byteLength, sampleRate);

  // WAV 바이너리 → base64
  const wav = new Uint8Array(header.byteLength + dataBytes.byteLength);
  wav.set(new Uint8Array(header), 0);
  wav.set(new Uint8Array(dataBytes), header.byteLength);

  // Uint8Array → base64 (chunk 방식)
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < wav.length; i += chunkSize) {
    const slice = wav.subarray(i, Math.min(i + chunkSize, wav.length));
    binary += String.fromCharCode(...slice);
  }
  const base64 = btoa(binary);

  const file = new File(Paths.cache, `debug_audio_${Date.now()}.wav`);
  file.write(base64, { encoding: 'base64' });
  const path = file.uri;

  const duration = (totalLen / sampleRate).toFixed(1);
  console.log(`[Debug] WAV saved: ${path} (${duration}s, ${totalLen} samples)`);

  Alert.alert('녹음 저장 완료', `${duration}초 녹음\n${path}`);
}

// ─── Ring Buffer ───
class RingBuffer {
  private buf: Float32Array;
  private pos = 0;
  private full = false;
  constructor(cap: number) { this.buf = new Float32Array(cap); }

  write(samples: Float32Array): void {
    const len = samples.length;
    const cap = this.buf.length;
    if (len >= cap) {
      this.buf.set(samples.subarray(len - cap));
      this.pos = 0;
      this.full = true;
      return;
    }
    const space = cap - this.pos;
    if (len <= space) {
      this.buf.set(samples, this.pos);
    } else {
      this.buf.set(samples.subarray(0, space), this.pos);
      this.buf.set(samples.subarray(space), 0);
    }
    this.pos = (this.pos + len) % cap;
    if (!this.full && this.pos < len) this.full = true;
  }

  read(): Float32Array {
    if (!this.full) return this.buf.slice(0, this.pos);
    const result = new Float32Array(this.buf.length);
    const tail = this.buf.length - this.pos;
    result.set(this.buf.subarray(this.pos), 0);
    result.set(this.buf.subarray(0, this.pos), tail);
    return result;
  }

  reset(): void { this.buf.fill(0); this.pos = 0; this.full = false; }
}

// ─── Hook ───
export type PipelineMode = 'streaming' | 'batch' | 'native';

interface UseWebAudioPipelineOptions {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  boostWords?: string[];
  webViewRef: React.RefObject<WebView | null>;
  mode?: PipelineMode;
}

export interface WebAudioPipelineResult extends AudioPipelineResult {
  handleWebViewMessage: (event: WebViewMessageEvent) => void;
}

export function useWebAudioPipeline({
  onInterimResult,
  onFinalResult,
  onVoiceStart,
  onVoiceEnd,
  boostWords,
  webViewRef,
  mode = 'streaming',
}: UseWebAudioPipelineOptions): WebAudioPipelineResult & { onWebViewReady: () => void } {
  const [state, setState] = useState<PipelineState>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<PipelineState>('IDLE');
  const webViewReadyRef = useRef(false);
  const pendingStartRef = useRef(false);
  const vadRef = useRef<SileroVADInstance | null>(null);
  const ringBufferRef = useRef(new RingBuffer(PRE_BUFFER_SAMPLES));
  const transcribingRef = useRef(false);

  const consecutiveSpeechRef = useRef(0);
  const utteranceSamplesRef = useRef(0);

  // VAD accumulator
  const accBufRef = useRef(new Float32Array(4096 + WINDOW_SIZE));
  const accLenRef = useRef(0);
  const processingRef = useRef(false);

  const processChunkRef = useRef<(buffer: Float32Array) => Promise<void>>(async () => {});
  const finishTranscriptionRef = useRef<() => void>(() => {});
  const injectStartRecordingRef = useRef<() => void>(() => {});

  // Callback refs
  const onInterimRef = useRef(onInterimResult);
  const onFinalRef = useRef(onFinalResult);
  const onVoiceStartRef = useRef(onVoiceStart);
  const onVoiceEndRef = useRef(onVoiceEnd);
  onInterimRef.current = onInterimResult;
  onFinalRef.current = onFinalResult;
  onVoiceStartRef.current = onVoiceStart;
  onVoiceEndRef.current = onVoiceEnd;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Batch 모드 전용
  const speechBufferRef = useRef<Float32Array[]>([]);
  const speechBufferSamplesRef = useRef(0);
  const silenceFrameCountRef = useRef(0);
  const batchFlushingRef = useRef(false); // flush 재진입 방지

  // Debug: 전체 녹음 누적
  const debugRecordingRef = useRef<Float32Array[]>([]);

  // STT results
  const { text, isFinal, error: sttError } = useRealTimeTranscription();
  const prevTextRef = useRef('');
  const sttSeqRef = useRef(0);

  // ─── State helpers ───
  const transitionTo = useCallback((s: PipelineState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const finishTranscription = useCallback(() => {
    transcribingRef.current = false;
    batchFlushingRef.current = false;

    // native 모드에서는 stopBufferTranscription 불필요
    if (modeRef.current !== 'native') {
      stopBufferTranscription();
    }
    onVoiceEndRef.current?.();

    vadRef.current?.reset();
    ringBufferRef.current.reset();
    consecutiveSpeechRef.current = 0;
    utteranceSamplesRef.current = 0;
    accLenRef.current = 0;
    speechBufferRef.current = [];
    speechBufferSamplesRef.current = 0;
    silenceFrameCountRef.current = 0;

    transitionTo('LISTENING');
  }, [transitionTo]);
  finishTranscriptionRef.current = finishTranscription;

  const vadSpeechStartRef = useRef(0);
  const firstSttResultRef = useRef(true);

  //음성 데이터를 텍스트로 변환해주는 함수
  const startTranscribing = useCallback(() => {
    vadSpeechStartRef.current = performance.now();
    firstSttResultRef.current = true;
    console.log(`[WebAudioPipeline] VAD → speech, opening STT (mode: ${modeRef.current})`);
    onVoiceStartRef.current?.();

    if (modeRef.current === 'streaming') {
      const preBuffer = ringBufferRef.current.read();
      if (preBuffer.length > 0) {
        realtimeBufferTranscribe(preBuffer, SAMPLE_RATE);
      }
      utteranceSamplesRef.current = preBuffer.length;
    } else if (modeRef.current === 'batch') {
      const preBuffer = ringBufferRef.current.read();
      speechBufferRef.current = preBuffer.length > 0 ? [preBuffer] : [];
      speechBufferSamplesRef.current = preBuffer.length;
      silenceFrameCountRef.current = 0;
      batchFlushingRef.current = false;
      utteranceSamplesRef.current = preBuffer.length;
    } else {
      // native 모드: VAD만, 버퍼 처리 없음
      silenceFrameCountRef.current = 0;
      utteranceSamplesRef.current = 0;
    }

    transcribingRef.current = true;
    prevTextRef.current = '';
    sttSeqRef.current++;
    transitionTo('TRANSCRIBING');
  }, [transitionTo]);

  // ─── Batch 모드: 일괄 전송 ───
  const flushBatchBuffer = useCallback(() => {
    if (batchFlushingRef.current) return; // 재진입 방지
    batchFlushingRef.current = true;

    if (speechBufferRef.current.length === 0) {
      finishTranscriptionRef.current();
      return;
    }

    const totalSamples = speechBufferSamplesRef.current;
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of speechBufferRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`[WebAudioPipeline] Batch: sending ${totalSamples} samples (${(totalSamples / SAMPLE_RATE).toFixed(2)}s)`);
    realtimeBufferTranscribe(merged, SAMPLE_RATE);

    // 버퍼 비우되 TRANSCRIBING 상태 유지 — 인식기 결과 대기
    speechBufferRef.current = [];
    speechBufferSamplesRef.current = 0;
    silenceFrameCountRef.current = 0;

    // pipe 닫기 (인식기에 오디오 끝 신호) — 인식기는 유지
    setTimeout(() => {
      console.log('[WebAudioPipeline] Batch: closing pipe (end of audio)');
      stopBufferTranscription();
    }, 300);

    // finishTranscription은 호출하지 않음
    // STT 결과/에러 이벤트가 오면 그때 finishTranscription 호출됨
  }, []);

  // ─── STT result handler ───
  useEffect(() => {
    if (!text || text === prevTextRef.current) return;
    prevTextRef.current = text;

    // native 모드 또는 TRANSCRIBING 상태에서 결과 처리
    // native 모드: 네이티브 인식기 결과가 비동기로 오므로 LISTENING 상태일 수 있음
    const isNativeMode = modeRef.current === 'native';
    if (!isNativeMode && stateRef.current !== 'TRANSCRIBING') return;

    const now = performance.now();
    const sinceVAD = vadSpeechStartRef.current > 0 ? (now - vadSpeechStartRef.current).toFixed(0) : '?';
    const isFirst = firstSttResultRef.current;
    firstSttResultRef.current = false;

    if (isFinal) {
      if (!isNativeMode && !transcribingRef.current) return;
      console.log(`[Perf:STT] final "${text}" | VAD→STT: ${sinceVAD}ms${isFirst ? ' (first result)' : ''}`);
      onFinalRef.current(text);
      if (transcribingRef.current) {
        finishTranscription();
      }
    } else {
      console.log(`[Perf:STT] interim "${text}" | VAD→STT: ${sinceVAD}ms${isFirst ? ' (first result)' : ''}`);
      onInterimRef.current(text);
    }
  }, [text, isFinal]);

  useEffect(() => {
    if (sttError && transcribingRef.current) {
      console.warn('[WebAudioPipeline] STT error:', sttError);
      prevTextRef.current = '';
      finishTranscription();
    }
  }, [sttError]);

  // ─── VAD handler ───
  const handleVADResult = useCallback(
    (prob: number) => {
      // LISTENING: speech 감지
      if (stateRef.current === 'LISTENING') {
        if (prob > SPEECH_THRESHOLD) {
          consecutiveSpeechRef.current++;
          if (consecutiveSpeechRef.current >= SPEECH_FRAMES_TO_ACTIVATE) {
            consecutiveSpeechRef.current = 0;
            startTranscribing();
          }
        } else {
          consecutiveSpeechRef.current = 0;
        }
        return;
      }

      // TRANSCRIBING + batch 모드: 침묵 감지로 flush
      if (stateRef.current === 'TRANSCRIBING' && modeRef.current === 'batch') {
        if (batchFlushingRef.current) return;

        if (prob > SPEECH_THRESHOLD) {
          silenceFrameCountRef.current = 0;
        } else {
          silenceFrameCountRef.current++;
          if (silenceFrameCountRef.current >= SILENCE_FRAMES_FOR_BATCH) {
            console.log('[WebAudioPipeline] batch: 0.5s silence detected');
            flushBatchBuffer();
          }
        }
      }
      // native 모드: VAD로 종료하지 않음 — 네이티브 인식기가 자체 결과/에러로 종료
    },
    [startTranscribing, flushBatchBuffer],
  );

  // ─── VAD 프레임 처리 ───
  const vadFrameCountRef = useRef(0);
  const processChunk = useCallback(
    async (buffer: Float32Array) => {
      // native 모드: LISTENING일 때만 VAD (시작 트리거만, 종료는 네이티브 인식기가 처리)
      const shouldProcess = stateRef.current === 'LISTENING' ||
        (stateRef.current === 'TRANSCRIBING' && modeRef.current === 'batch');
      if (!shouldProcess || !vadRef.current) return;

      const acc = accBufRef.current;
      let len = accLenRef.current;

      if (len + buffer.length > acc.length) {
        const newBuf = new Float32Array(len + buffer.length + WINDOW_SIZE);
        newBuf.set(acc.subarray(0, len));
        newBuf.set(buffer, len);
        accBufRef.current = newBuf;
        len += buffer.length;
      } else {
        acc.set(buffer, len);
        len += buffer.length;
      }

      let pos = 0;
      const cur = accBufRef.current;
      while (pos + WINDOW_SIZE <= len && (stateRef.current === 'LISTENING' ||
        (stateRef.current === 'TRANSCRIBING' && modeRef.current === 'batch'))) {
        const frame = cur.subarray(pos, pos + WINDOW_SIZE);
        pos += WINDOW_SIZE;
        const tVad0 = performance.now();
        const prob = await vadRef.current.process(frame);
        const tVad1 = performance.now();
        vadFrameCountRef.current++;
        if (vadFrameCountRef.current <= 3 || prob > SPEECH_THRESHOLD) {
          console.log(`[Perf:VAD] frame #${vadFrameCountRef.current} | ${(tVad1 - tVad0).toFixed(1)}ms | prob: ${prob.toFixed(3)}`);
        }
        handleVADResult(prob);
      }

      if (pos > 0 && pos < len) {
        accBufRef.current.copyWithin(0, pos, len);
      }
      accLenRef.current = len - pos;
    },
    [handleVADResult],
  );
  processChunkRef.current = processChunk;

  // ─── WebView bridge message handler ───
  const chunkLogCountRef = useRef(0);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);

        if (msg.type === 'debug') {
          console.log(`[WebAudioPipeline] Bridge debug: ${msg.msg}`);
          if (msg.msg === 'mic_ready') {
            webViewReadyRef.current = true;
            console.log('[WebAudioPipeline] Mic ready from web');
            if (pendingStartRef.current) {
              pendingStartRef.current = false;
              injectStartRecordingRef.current();
            }
          }
          return;
        }

        if (msg.type === 'audio_stream_start') {
          console.log('[WebAudioPipeline] Stream started from web');
          chunkLogCountRef.current = 0;
          return;
        }
        if (msg.type === 'audio_stream_end') {
          console.log('[WebAudioPipeline] Stream ended from web');
          return;
        }

        if (msg.type !== 'audio_stream_chunk') return;

        chunkLogCountRef.current++;
        if (chunkLogCountRef.current <= 10) {
          console.log(`[WebAudioPipeline] Chunk #${chunkLogCountRef.current}, bytes: ${msg.bytes}, state: ${stateRef.current}`);
        }

        if (stateRef.current === 'IDLE') return;

        const buffer = base64PcmToFloat32(msg.base64);

        // Debug: 모든 청크 누적
        debugRecordingRef.current.push(buffer);

        // Ring buffer — LISTENING일 때
        if (!transcribingRef.current) {
          ringBufferRef.current.write(buffer);
        }

        // STT feed — TRANSCRIBING일 때 (streaming/batch만)
        if (transcribingRef.current && !batchFlushingRef.current) {
          if (modeRef.current === 'streaming') {
            realtimeBufferTranscribe(buffer, SAMPLE_RATE);
          } else if (modeRef.current === 'batch') {
            speechBufferRef.current.push(buffer);
            speechBufferSamplesRef.current += buffer.length;
          }
          // native 모드: 버퍼 처리 없음

          if (modeRef.current !== 'native') {
            utteranceSamplesRef.current += buffer.length;
            if (utteranceSamplesRef.current >= MAX_UTTERANCE_SAMPLES) {
              console.log('[WebAudioPipeline] Max utterance reached');
              if (modeRef.current === 'batch') {
                flushBatchBuffer();
              } else {
                finishTranscriptionRef.current();
              }
              return;
            }
          }
        }

        // VAD 처리: native 모드는 LISTENING일 때만 (시작 트리거용)
        const shouldRunVAD = stateRef.current === 'LISTENING' ||
          (stateRef.current === 'TRANSCRIBING' &&
           modeRef.current === 'batch' &&
           !batchFlushingRef.current);

        if (shouldRunVAD) {
          if (processingRef.current) {
            const acc = accBufRef.current;
            const len = accLenRef.current;
            if (len + buffer.length > acc.length) {
              const newBuf = new Float32Array(len + buffer.length + WINDOW_SIZE);
              newBuf.set(acc.subarray(0, len));
              newBuf.set(buffer, len);
              accBufRef.current = newBuf;
            } else {
              acc.set(buffer, len);
            }
            accLenRef.current = len + buffer.length;
          } else {
            processingRef.current = true;
            processChunkRef.current(buffer).finally(() => {
              processingRef.current = false;
            });
          }
        }
      } catch {
        // bridge 외 다른 메시지 무시
      }
    },
    [],
  );

  // ─── WebView 녹음 시작 inject ───
  const injectStartRecording = useCallback(() => {
    if (!webViewRef.current) {
      console.warn('[WebAudioPipeline] WebView ref is null, cannot inject');
      return;
    }
    console.log('[WebAudioPipeline] Injecting __startRecording');
    webViewRef.current.injectJavaScript(`
      if (window.__startRecording) {
        window.__startRecording();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', msg: 'startRecording called' }));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', msg: '__startRecording NOT found' }));
      }
      true;
    `);
  }, [webViewRef]);
  injectStartRecordingRef.current = injectStartRecording;

  const onWebViewReady = useCallback(() => {
    console.log('[WebAudioPipeline] WebView ready');
    webViewReadyRef.current = true;
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      injectStartRecording();
    }
  }, [injectStartRecording]);

  // ─── Start ───
  const start = useCallback(async () => {
    try {
      setError(null);

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '마이크 권한 필요',
          '음성 인식을 사용하려면 마이크 권한이 필요합니다. 설정에서 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ],
        );
        setError('Mic permission denied');
        return;
      }

      if (!vadRef.current) {
        console.log('[WebAudioPipeline] Loading Silero VAD...');
        vadRef.current = await createSileroVAD();
        console.log('[WebAudioPipeline] VAD loaded');
      } else {
        vadRef.current.reset();
      }

      // Reset
      ringBufferRef.current.reset();
      accLenRef.current = 0;
      consecutiveSpeechRef.current = 0;
      utteranceSamplesRef.current = 0;
      transcribingRef.current = false;
      processingRef.current = false;
      prevTextRef.current = '';
      speechBufferRef.current = [];
      speechBufferSamplesRef.current = 0;
      silenceFrameCountRef.current = 0;
      batchFlushingRef.current = false;
      debugRecordingRef.current = [];

      if (boostWords && boostWords.length > 0) {
        setContextualStrings(boostWords);
        console.log(`[WebAudioPipeline] contextualStrings set: ${boostWords.length} words`);
      }

      if (webViewReadyRef.current) {
        injectStartRecording();
      } else {
        console.log('[WebAudioPipeline] WebView not ready yet, pending start...');
        pendingStartRef.current = true;
      }

      transitionTo('LISTENING');
      console.log(`[WebAudioPipeline] Started (mode: ${mode})`);
    } catch (err: any) {
      console.error('[WebAudioPipeline] Start failed:', err);
      setError(err.message || 'Failed to start pipeline');
    }
  }, [transitionTo, boostWords, injectStartRecording, mode]);

  // ─── Stop ───
  const stop = useCallback(() => {
    if (transcribingRef.current) {
      transcribingRef.current = false;
      if (modeRef.current !== 'native') {
        stopBufferTranscription();
      }
      onVoiceEndRef.current?.();
    }

    webViewRef.current?.injectJavaScript(`
      if (window.__stopRecording) window.__stopRecording();
      true;
    `);

    // Debug: 녹음 저장 + 공유
    const chunks = debugRecordingRef.current;
    if (chunks.length > 0) {
      console.log('[Debug] 녹음 청크 ' + chunks.length + '개, 저장 중...');
      saveAndShareWav(chunks, SAMPLE_RATE).catch(e => console.warn('[Debug] WAV 저장 실패:', e));
      debugRecordingRef.current = [];
    }

    ringBufferRef.current.reset();
    consecutiveSpeechRef.current = 0;
    utteranceSamplesRef.current = 0;
    prevTextRef.current = '';
    accLenRef.current = 0;
    processingRef.current = false;
    speechBufferRef.current = [];
    speechBufferSamplesRef.current = 0;
    silenceFrameCountRef.current = 0;
    batchFlushingRef.current = false;
    transitionTo('IDLE');
  }, [transitionTo, webViewRef]);

  // ─── Reset ───
  const resetTranscription = useCallback(() => {
    if (stateRef.current !== 'TRANSCRIBING') return;
    console.log('[WebAudioPipeline] Reset (NLU matched)');
    finishTranscription();
  }, [finishTranscription]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (transcribingRef.current) {
        transcribingRef.current = false;
        stopBufferTranscription();
      }
      vadRef.current?.dispose();
      vadRef.current = null;
    };
  }, []);

  return { state, start, stop, resetTranscription, error, handleWebViewMessage, onWebViewReady };
}
