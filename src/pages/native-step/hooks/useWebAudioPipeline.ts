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

const { speechModule, realtimeBufferTranscribe, stopBufferTranscription, setContextualStrings, useRealTimeTranscription } = (() => {
  try {
    const mod = require('expo-speech-transcriber');
    return {
      speechModule: mod,
      realtimeBufferTranscribe: mod.realtimeBufferTranscribe ?? (() => {}),
      stopBufferTranscription: mod.stopBufferTranscription ?? (() => {}),
      setContextualStrings: mod.setContextualStrings ?? (() => {}),
      useRealTimeTranscription: mod.useRealTimeTranscription ?? (() => ({ results: null })),
    };
  } catch (e) {
    console.warn('[useWebAudioPipeline] expo-speech-transcriber 로드 실패:', e);
    return {
      speechModule: null as any,
      realtimeBufferTranscribe: (() => {}) as any,
      stopBufferTranscription: (() => {}) as any,
      setContextualStrings: (() => {}) as any,
      useRealTimeTranscription: (() => ({ results: null })) as any,
    };
  }
})();
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

  //   Case 1: len >= cap (입력이 버퍼보다 크거나 같음)                                                       samples = [a b c d e f g h i j k l]  (len=12, cap=10)                                                  → 뒤에서 cap개만 잘라서 통째로 복사                                                                    buf: [c d e f g h i j k l]  pos=0, full=true                                                           앞쪽 데이터는 어차피 오래된 거니까 버립니다.
  //                                                          Case 2: len <= space (남은 공간에 다 들어감)                                                           buf: [a b c _ _ _ _ _ _ _]  pos=3, space=7
  // samples = [x y z]  (len=3)                                                                             → pos 위치부터 그냥 복사
  // buf: [a b c x y z _ _ _ _]  pos=6

  // Case 3: len > space (남은 공간 초과 → wrap around)
  // buf: [_ _ _ _ _ _ _ a b c]  pos=7, space=3
  // samples = [x y z w v]  (len=5)

  // 1단계: 뒤쪽 빈 공간(3칸)에 x,y,z 채움
  // buf: [_ _ _ _ _ _ _ x y z]

  // 2단계: 나머지 w,v를 앞쪽(0번)부터 채움
  // buf: [w v _ _ _ _ _ x y z]  pos=2, full=true

  // 핵심: 메모리 할당 없이 고정 배열을 돌려쓰면서 항상 가장 최근 데이터만 유지합니다. 오디오 STT에서
  // "최근 N초 분량의 오디오"를 유지하는 데 쓰이는 전형적인 패턴입니다.
  write(samples: Float32Array): void {
    const len = samples.length;
    const cap = this.buf.length;
    //샘플이 넣을 수 있는 양보다 많다면 뒤에 잘라서 넣음
    if (len >= cap) {
      this.buf.set(samples.subarray(len - cap));
      this.pos = 0;
      this.full = true;
      return;
    }
    const space = cap - this.pos;
    //남은 공간에 다 들어감
    if (len <= space) {
      this.buf.set(samples, this.pos);
    } else {//남은 공간 초과 시계 방향 순서로 채움
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
type UseWebAudioPipelineOptions = {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  boostWords?: string[];
  webViewRef: React.RefObject<WebView | null>;
}

export type WebAudioPipelineResult = AudioPipelineResult & {
  handleWebViewMessage: (event: WebViewMessageEvent) => void;
  vadSpeechStartRef: React.RefObject<number>;
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

  // VAD accumulator(VAD만 알면 됨)
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
    //링버퍼 초기화
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

    // 매 발화 시작 전 biasing 설정 (realtimeBufferTranscribe에서 Kotlin으로 전달)
    if (boostWords && boostWords.length > 0) {
      (globalThis as any).__sttBiasingWords = boostWords;
    }

    const preBuffer = ringBufferRef.current.read();
    if (preBuffer.length > 0) {
      realtimeBufferTranscribe(preBuffer, SAMPLE_RATE, boostWords ?? []);
    }
    utteranceSamplesRef.current = preBuffer.length;

    transcribingRef.current = true;
    prevTextRef.current = '';
    sttSeqRef.current++;
    transitionTo('TRANSCRIBING');
  }, [transitionTo, boostWords]);

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

  //     1단계: 누적 — 들어온 청크를 accBuf에 이어붙임
  // accBuf: [기존 데이터 ... | 새 buffer 추가]
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

        //그리고 웹뷰는 음성만 전달해주고, 권한 이런거는 네이티브에서 체크해야 함.
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
          realtimeBufferTranscribe(buffer, SAMPLE_RATE, []);
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
  //
  const injectStartRecording = useCallback(() => {
    if (!webViewRef.current) {
      console.warn('[WebAudioPipeline] WebView ref is null, cannot send START_RECORDING');
      return;
    }
    console.log('[WebAudioPipeline] Sending START_RECORDING via postMessage');
    webViewRef.current.postMessage(JSON.stringify({ type: 'START_RECORDING' }));
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
  // 접근은 앱의 네이티브 RECORD_AUDIO 권한이 먼저 승인되어 있어야 합니다
  // 사용자가 마이크 버튼 탭
  //          │
  //          ▼
  //   ① 네이티브 권한 (Audio.requestPermissionsAsync)
  //      → AndroidManifest의 RECORD_AUDIO
  //      → OS 레벨 권한 다이얼로그
  //          │
  //          ▼
  //   ② WebView getUserMedia()
  //      → WebView 내부에서 onPermissionRequest 콜백으로 승인
  //      → ①이 거부되어 있으면 여기서 자동 실패
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

      // Speech Recognition 권한 요청 (iOS 설정에 "음성 인식" 항목 생성)
      console.log('[WebAudioPipeline] speechModule:', !!speechModule, 'requestPermissions:', !!speechModule?.requestPermissions);
      if (speechModule?.requestPermissions) {
        const speechStatus = await speechModule.requestPermissions();
        console.log('[WebAudioPipeline] speech permission status:', speechStatus);
        if (speechStatus !== 'authorized') {
          Alert.alert(
            '음성 인식 권한 필요',
            '음성 명령을 사용하려면 음성 인식 권한이 필요합니다. 설정에서 허용해주세요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '설정으로 이동', onPress: () => Linking.openSettings() },
            ],
          );
          setError('Speech permission denied');
          return;
        }
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
      //굳이 길이를 왜 저장해두지?
      accLenRef.current = 0;
      //VAD 0.7이상이 얼마나 진행되었는지
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

    webViewRef.current?.postMessage(JSON.stringify({ type: 'STOP_RECORDING' }));

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
  //컴포넌트 종료시 리셋
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

  return { state, start, stop, resetTranscription, error, handleWebViewMessage, onWebViewReady, vadSpeechStartRef };
}
