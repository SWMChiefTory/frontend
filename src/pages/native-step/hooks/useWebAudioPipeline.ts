/**
 * useWebAudioPipeline – WebView bridge 기반 VAD-gated STT pipeline
 *
 * WebView에서 getUserMedia(echoCancellation:true)로 녹음 →
 * bridge를 통해 base64 PCM 청크 수신 →
 * Silero VAD + expo-speech-transcriber (streaming)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Audio } from 'expo-av';

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

  //꼭 queue를 구현할 필요가 있을까??
  //뭔말인지 몰랐음.
  // Ring Buffer의 read() 메서드입니다. 순환 버퍼에 저장된 오디오 데이터를 시간순으로 정렬해서 반환합니다.

  // 예: buf = [D, E, A, B, C],  pos = 2,  full = true
  //             ^pos

  // 실제 시간 순서: A, B, C, D, E

  // read()가 하는 일:
  //   tail = 5 - 2 = 3
  //   result[0..2] = buf[2..4]  → [A, B, C]  (pos 뒤쪽 = 오래된 데이터)
  //   result[3..4] = buf[0..1]  → [D, E]     (pos 앞쪽 = 최신 데이터)
  //   → [A, B, C, D, E] ✅ 시간순 정렬
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
interface UseWebAudioPipelineOptions {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  boostWords?: string[];
  webViewRef: React.RefObject<WebView | null>;
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
    stopBufferTranscription();
    onVoiceEndRef.current?.();

    vadRef.current?.reset();
    ringBufferRef.current.reset();
    consecutiveSpeechRef.current = 0;
    utteranceSamplesRef.current = 0;
    accLenRef.current = 0;

    transitionTo('LISTENING');
  }, [transitionTo]);
  finishTranscriptionRef.current = finishTranscription;

  const vadSpeechStartRef = useRef(0);
  const firstSttResultRef = useRef(true);

  //음성 데이터를 텍스트로 변환해주는 함수
  const startTranscribing = useCallback(() => {
    vadSpeechStartRef.current = performance.now();
    firstSttResultRef.current = true;
    console.log('[WebAudioPipeline] VAD → speech, opening STT');
    onVoiceStartRef.current?.();

    const preBuffer = ringBufferRef.current.read();
    if (preBuffer.length > 0) {
      realtimeBufferTranscribe(preBuffer, SAMPLE_RATE);
    }
    utteranceSamplesRef.current = preBuffer.length;

    transcribingRef.current = true;
    prevTextRef.current = '';
    sttSeqRef.current++;
    transitionTo('TRANSCRIBING');
  }, [transitionTo]);

  // ─── STT result handler ───
  useEffect(() => {
    if (!text || text === prevTextRef.current) return;
    prevTextRef.current = text;
    if (stateRef.current !== 'TRANSCRIBING') return;

    const now = performance.now();
    const sinceVAD = vadSpeechStartRef.current > 0 ? (now - vadSpeechStartRef.current).toFixed(0) : '?';
    const isFirst = firstSttResultRef.current;
    firstSttResultRef.current = false;

    if (isFinal) {
      if (!transcribingRef.current) return;
      console.log(`[Perf:STT] final "${text}" | VAD→STT: ${sinceVAD}ms${isFirst ? ' (first result)' : ''}`);
      onFinalRef.current(text);
      finishTranscription();
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
      if (stateRef.current !== 'LISTENING') return;

      if (prob > SPEECH_THRESHOLD) {
        consecutiveSpeechRef.current++;
        if (consecutiveSpeechRef.current >= SPEECH_FRAMES_TO_ACTIVATE) {
          consecutiveSpeechRef.current = 0;
          startTranscribing();
        }
      } else {
        consecutiveSpeechRef.current = 0;
      }
    },
    [startTranscribing],
  );

  // ─── VAD 프레임 처리 ───
  const vadFrameCountRef = useRef(0);
  const processChunk = useCallback(
    async (buffer: Float32Array) => {
      if (stateRef.current !== 'LISTENING' || !vadRef.current) return;

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
      while (pos + WINDOW_SIZE <= len && stateRef.current === 'LISTENING') {
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

        //디버그 코드느 실제 로직과 분리하는 건 어떨까
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

        // Ring buffer — LISTENING일 때
        if (!transcribingRef.current) {
          ringBufferRef.current.write(buffer);
        }

        // STT feed — TRANSCRIBING일 때
        if (transcribingRef.current) {
          realtimeBufferTranscribe(buffer, SAMPLE_RATE);
          utteranceSamplesRef.current += buffer.length;

          if (utteranceSamplesRef.current >= MAX_UTTERANCE_SAMPLES) {
            console.log('[WebAudioPipeline] Max utterance reached');
            finishTranscriptionRef.current();
            return;
          }
        }

        // VAD — LISTENING일 때만
        if (stateRef.current === 'LISTENING') {
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
      console.log('[WebAudioPipeline] Started (streaming)');
    } catch (err: any) {
      console.error('[WebAudioPipeline] Start failed:', err);
      setError(err.message || 'Failed to start pipeline');
    }
  }, [transitionTo, boostWords, injectStartRecording]);

  // ─── Stop ───
  const stop = useCallback(() => {
    if (transcribingRef.current) {
      transcribingRef.current = false;
      stopBufferTranscription();
      onVoiceEndRef.current?.();
    }

    webViewRef.current?.injectJavaScript(`
      if (window.__stopRecording) window.__stopRecording();
      true;
    `);

    ringBufferRef.current.reset();
    consecutiveSpeechRef.current = 0;
    utteranceSamplesRef.current = 0;
    prevTextRef.current = '';
    accLenRef.current = 0;
    processingRef.current = false;
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
