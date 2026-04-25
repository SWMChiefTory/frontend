/**
 * useVoiceCommand – 음성 명령 (iOS + Android 통합)
 *
 * 모드:
 *   streaming (iOS, Android API33+ on-device): WebView 오디오 → VAD → 실시간 STT
 *   batch (Android API33+ cloud): WebView 오디오 → VAD → 0.5초 침묵 → 일괄 STT
 *   native (Android API<33): WebView 오디오 → VAD → WebView 녹음 중지 → 네이티브 SpeechRecognizer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { useWebAudioPipeline } from './useWebAudioPipeline';
import { classifyLocal, extractSlots, normalize } from './useLocalNLU';
// NLU 모델 비활성화 — partial interim에서 조기 dispatch 문제로 STT 세션이 죽음
// import { createNLU, type IntentLabel } from './onnxNLU';
import type { IntentLabel } from './onnxNLU';
import type { HandleIntentFn } from './useIntentMatchingAction';

// const NLU_CONFIDENCE_THRESHOLD = 0.7;

type UseVoiceCommandOptions = {
  onIntent: HandleIntentFn;
  sceneLabels: string[];
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  webViewRef: RefObject<WebView | null>;
  postToYouTube: (msg: object) => void;
};

export function useVoiceCommand({
  onIntent,
  sceneLabels,
  totalSteps,
  isFirstStep,
  isLastStep,
  webViewRef,
  postToYouTube,
}: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [intentFeedback, setIntentFeedback] = useState<{ text: string; intent: string } | null>(null);
  const [transcript, setTranscript] = useState('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const handledInInterimRef = useRef(false);

  // ─── NLU 모델 로드 (비활성화) ───
  // partial interim ("장면" 단독 등)에서 조기 dispatch 발생 → STT 세션 죽이는 버그.
  // 키워드 매칭(Tier 1)만으로 충분하다고 판단되어 비활성화.
  // const nluReadyRef = useRef(false);
  // const nluRef = useRef<Awaited<ReturnType<typeof createNLU>> | null>(null);
  //
  // useEffect(() => {
  //   createNLU()
  //     .then((nlu) => {
  //       nluRef.current = nlu;
  //       nluReadyRef.current = true;
  //       console.log('[VoiceCommand] NLU model ready');
  //     })
  //     .catch((e) => console.warn('[VoiceCommand] NLU model load failed:', e));
  // }, []);

  const showFeedback = useCallback((text: string, intent: string = 'UNKNOWN') => {
    setIntentFeedback({ text, intent });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setIntentFeedback(null), 1800);
  }, []);

  /** Call onIntent and show the returned feedback */
  const dispatchIntent = useCallback(
    (intent: IntentLabel, payload: { stepNumber?: number; sceneNumber?: number; durationSec?: number } = {}): boolean => {
      if (intent === 'EXTRA') return false;
      const feedback = onIntent(intent, payload);
      if (feedback) {
        showFeedback(feedback.text, feedback.intent);
        return true;
      }
      return false;
    },
    [onIntent, showFeedback],
  );

  // ONNX 폴백에서 GO_TO_STEP 받았을 때 슬롯 추출용 (비활성화)
  // const extractStepNumberForOnnx = useCallback((text: string): number | undefined => {
  //   const slots = extractSlots(normalize(text));
  //   return slots.stepNumber;
  // }, []);

  // ─── Volume Ducking ───
  const onVoiceStart = useCallback(() => {
    postToYouTube({ type: 'SET_VOLUME', volume: 0 });
  }, [postToYouTube]);

  const onVoiceEnd = useCallback(() => {
    postToYouTube({ type: 'SET_VOLUME', volume: 1 });
  }, [postToYouTube]);

  // ─── interim/final handlers ───
  const resetTranscriptionRef = useRef<() => void>(() => {});

  const handleInterimResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setTranscript(text);

      // 1. 키워드 매칭
      const localResult = classifyLocal(text);
      if (localResult) {
        const executed = dispatchIntent(localResult.intent, localResult.payload);
        if (executed) {
          handledInInterimRef.current = true;
          resetTranscriptionRef.current();
          return;
        }
      }

      // 2. NLU 추론 (비활성화 — partial interim 조기 dispatch 방지)
      // if (nluReadyRef.current && nluRef.current) {
      //   try {
      //     const tNlu0 = performance.now();
      //     const result = await nluRef.current.classify(text);
      //     const tNlu1 = performance.now();
      //     console.log(`[Perf:NLU] interim "${text}" → ${result?.intent ?? 'none'}(${((result?.confidence ?? 0) * 100).toFixed(1)}%) | ${(tNlu1 - tNlu0).toFixed(1)}ms`);
      //
      //     if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
      //       const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumberForOnnx(text) : undefined;
      //       const executed = dispatchIntent(result.intent, { stepNumber: stepNum });
      //       if (executed) {
      //         console.log(`[Perf:E2E] interim "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
      //         handledInInterimRef.current = true;
      //         resetTranscriptionRef.current();
      //         return;
      //       }
      //     }
      //   } catch (e) { console.warn('[VoiceCommand] NLU interim error:', e); }
      // }
    },
    [dispatchIntent],
  );

  const handleFinalResult = useCallback(
    async (text: string) => {
      if (handledInInterimRef.current) {
        handledInInterimRef.current = false;
        return;
      }
      if (!text.trim()) return;
      setTranscript(text);

      // 1. 키워드 매칭
      const localResult = classifyLocal(text);
      if (localResult) {
        dispatchIntent(localResult.intent, localResult.payload);
        return;
      }

      // 2. NLU 추론 (비활성화)
      // if (nluReadyRef.current && nluRef.current) {
      //   try {
      //     const tNlu0 = performance.now();
      //     const result = await nluRef.current.classify(text);
      //     const tNlu1 = performance.now();
      //     console.log(`[Perf:NLU] final "${text}" → ${result?.intent ?? 'none'}(${((result?.confidence ?? 0) * 100).toFixed(1)}%) | ${(tNlu1 - tNlu0).toFixed(1)}ms`);
      //
      //     if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
      //       const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumberForOnnx(text) : undefined;
      //       dispatchIntent(result.intent, { stepNumber: stepNum });
      //       console.log(`[Perf:E2E] final "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
      //       return;
      //     }
      //   } catch (e) { console.warn('[VoiceCommand] NLU final error:', e); }
      // }
    },
    [dispatchIntent],
  );

  // ─── boost words (고정 키워드만) ───
  const boostWords = useMemo(() => {
    return [
      // 영상/네비 명령
      '다음', '이전', '재생', '정지', '멈춰', '넘어가', '뒤로', '단계', '플레이', '스탑',
      '중지', '완료', '끝',
      // 인덱스 키워드
      '장면', '스텝',
      // 숫자 (한자)
      '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십',
      // 숫자 (순우리말)
      '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
      // 서수
      '첫', '첫번째', '두번째', '세번째', '네번째', '다섯번째',
      // 타이머
      '타이머', '시작', '취소', '일시정지', '일시 정지', '재개', '종료',
      // 시간 단위
      '분', '초', '시간',
    ];
  }, []);

  // ─── Web Audio Pipeline ───
  const {
    state: pipelineState,
    start: pipelineStart,
    stop: pipelineStop,
    resetTranscription,
    error: pipelineError,
    handleWebViewMessage,
    onWebViewReady,
  } = useWebAudioPipeline({
    onInterimResult: handleInterimResult,
    onFinalResult: handleFinalResult,
    onVoiceStart,
    onVoiceEnd,
    boostWords,
    webViewRef,
  });

  resetTranscriptionRef.current = () => {
    handledInInterimRef.current = false;
    resetTranscription();
  };

  const startListening = useCallback(async () => {
    isListeningRef.current = true;
    setIsListening(true);
    handledInInterimRef.current = false;
    setTranscript('');
    await pipelineStart();
  }, [pipelineStart]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    pipelineStop();
  }, [pipelineStop]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) stopListening();
    else startListening();
  }, [startListening, stopListening]);

  return {
    isListening,
    transcript,
    speechError: pipelineError,
    intentFeedback,
    pipelineState,
    toggleListening,
    stopListening,
    handleWebViewMessage,
    onWebViewReady,
  };
}
