/**
 * useVoiceCommand – 음성 명령 (iOS + Android 통합)
 *
 * 모드:
 *   streaming (iOS, Android API33+ on-device): WebView 오디오 → VAD → 실시간 STT
 *   batch (Android API33+ cloud): WebView 오디오 → VAD → 0.5초 침묵 → 일괄 STT
 *   native (Android API<33): WebView 오디오 → VAD → WebView 녹음 중지 → 네이티브 SpeechRecognizer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { WebView } from 'react-native-webview';
import { useWebAudioPipeline } from './useWebAudioPipeline';
import { classifyLocal, extractSlots, normalize, type LocalNLUPayload } from './useLocalNLU';
import { createNLU, type IntentLabel } from './onnxNLU';

function formatDuration(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}분 ${s}초` : `${m}분`;
  }
  return `${sec}초`;
}
import { useSceneMatcher } from './useSceneMatcher';


const NLU_CONFIDENCE_THRESHOLD = 0.7;

type UseVoiceCommandOptions = {
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (stepNumber: number) => void;
  seekToScene: (sceneIndex: number) => void;
  seekToSceneNumber: (sceneNumber: number) => void; // 1-indexed
  play: () => void;
  pause: () => void;
  startTimer: (durationSec: number) => void;
  cancelTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  sceneLabels: string[];
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  webViewRef: React.RefObject<WebView | null>;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
}

export function useVoiceCommand({
  goToNextStep,
  goToPrevStep,
  goToStep,
  seekToScene,
  seekToSceneNumber,
  play,
  pause,
  startTimer,
  cancelTimer,
  pauseTimer,
  resumeTimer,
  sceneLabels,
  totalSteps,
  isFirstStep,
  isLastStep,
  webViewRef,
  onVoiceStart,
  onVoiceEnd,
}: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [intentFeedback, setIntentFeedback] = useState<{ text: string; intent: string } | null>(null);
  const [transcript, setTranscript] = useState('');
  const [sceneSearching, setSceneSearching] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const handledInInterimRef = useRef(false);


  // ─── NLU 모델 로드 ───
  const nluReadyRef = useRef(false);
  const nluRef = useRef<Awaited<ReturnType<typeof createNLU>> | null>(null);

  useEffect(() => {
    createNLU()
      .then((nlu) => {
        nluRef.current = nlu;
        nluReadyRef.current = true;
        console.log('[VoiceCommand] NLU model ready');
      })
      .catch((e) => console.warn('[VoiceCommand] NLU model load failed:', e));
  }, []);

  const { findBestScene } = useSceneMatcher(sceneLabels);

  const showFeedback = useCallback((text: string, intent: string = 'UNKNOWN') => {
    setIntentFeedback({ text, intent });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setIntentFeedback(null), 1800);
  }, []);

  const executeIntent = useCallback(
    (intent: IntentLabel, payload: LocalNLUPayload = {}) => {
      if (intent === 'EXTRA') return false;
      switch (intent) {
        case 'NEXT_STEP':
          if (isLastStep) { showFeedback('마지막 단계예요', 'NEXT_STEP'); }
          else { goToNextStep(); showFeedback('다음 단계 →', 'NEXT_STEP'); }
          break;
        case 'PREV_STEP':
          if (isFirstStep) { showFeedback('첫 번째 단계예요', 'PREV_STEP'); }
          else { goToPrevStep(); showFeedback('← 이전 단계', 'PREV_STEP'); }
          break;
        case 'GO_TO_STEP': {
          const n = payload.stepNumber;
          if (n && n >= 1 && n <= totalSteps) {
            goToStep(n); showFeedback(`${n}단계로 이동`, 'GO_TO_STEP');
          } else {
            showFeedback(`${n}단계는 없어요`, 'GO_TO_STEP');
          }
          break;
        }
        case 'GO_TO_SCENE_NUMBER': {
          const n = payload.sceneNumber;
          if (n && n >= 1 && n <= sceneLabels.length) {
            seekToSceneNumber(n);
            showFeedback(`${n}번 장면`, 'GO_TO_SCENE_NUMBER');
          } else {
            showFeedback(`${n}번 장면은 없어요`, 'GO_TO_SCENE_NUMBER');
          }
          break;
        }
        case 'TIMER_START': {
          const sec = payload.durationSec;
          if (sec && sec > 0) {
            startTimer(sec);
            showFeedback(`⏱ ${formatDuration(sec)} 타이머`, 'TIMER_START');
          } else {
            showFeedback('몇 분 타이머인가요?', 'TIMER_START');
            return false;
          }
          break;
        }
        case 'TIMER_CANCEL':
          cancelTimer();
          showFeedback('⏱ 타이머 취소', 'TIMER_CANCEL');
          break;
        case 'TIMER_PAUSE':
          pauseTimer();
          showFeedback('⏱ 타이머 일시정지', 'TIMER_PAUSE');
          break;
        case 'TIMER_RESUME':
          resumeTimer();
          showFeedback('⏱ 타이머 재개', 'TIMER_RESUME');
          break;
        case 'PLAY':
          play(); showFeedback('▶ 재생', 'PLAY');
          break;
        case 'PAUSE':
          pause(); showFeedback('⏸ 일시정지', 'PAUSE');
          break;
        case 'GO_TO_SCENE':
          return false;
      }
      return true;
    },
    [
      isLastStep, isFirstStep, totalSteps, sceneLabels.length,
      goToNextStep, goToPrevStep, goToStep, seekToSceneNumber,
      play, pause, startTimer, cancelTimer, pauseTimer, resumeTimer,
      showFeedback,
    ],
  );

  // ONNX 폴백에서 GO_TO_STEP 받았을 때 슬롯 추출용
  const extractStepNumberForOnnx = useCallback((text: string): number | undefined => {
    const slots = extractSlots(normalize(text));
    return slots.stepNumber;
  }, []);

  // ─── interim/final handlers ───
  const resetTranscriptionRef = useRef<() => void>(() => {});

  const handleInterimResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const tE2E = performance.now();
      setTranscript(text);

      // 1. 키워드 매칭
      const tKeyword0 = performance.now();
      const localResult = classifyLocal(text);
      const tKeyword1 = performance.now();
      if (localResult) {
        console.log(`[Perf:keyword] interim "${text}" → ${localResult.intent} | ${(tKeyword1 - tKeyword0).toFixed(1)}ms`);
        const executed = executeIntent(localResult.intent, localResult.payload);
        if (executed) {
          console.log(`[Perf:E2E] interim "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
          handledInInterimRef.current = true;
          resetTranscriptionRef.current();
          return;
        }
      }

      // 2. NLU 추론
      if (nluReadyRef.current && nluRef.current) {
        try {
          const tNlu0 = performance.now();
          const result = await nluRef.current.classify(text);
          const tNlu1 = performance.now();
          console.log(`[Perf:NLU] interim "${text}" → ${result?.intent ?? 'none'}(${((result?.confidence ?? 0) * 100).toFixed(1)}%) | ${(tNlu1 - tNlu0).toFixed(1)}ms`);

          if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
            if (result.intent === 'GO_TO_SCENE') {
              setSceneSearching(true);
              const tScene0 = performance.now();
              const sceneMatch = await findBestScene(text);
              const tScene1 = performance.now();
              setSceneSearching(false);
              console.log(`[Perf:scene] interim "${text}" → ${sceneMatch?.label ?? 'no match'} | ${(tScene1 - tScene0).toFixed(1)}ms`);
              if (sceneMatch) {
                seekToScene(sceneMatch.index);
                showFeedback(sceneMatch.label, 'GO_TO_SCENE');
                console.log(`[Perf:E2E] interim "${text}" → 장면 이동 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
                handledInInterimRef.current = true;
                resetTranscriptionRef.current();
                return;
              }
            } else {
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumberForOnnx(text) : undefined;
              const executed = executeIntent(result.intent, { stepNumber: stepNum });
              if (executed) {
                console.log(`[Perf:E2E] interim "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
                handledInInterimRef.current = true;
                resetTranscriptionRef.current();
                return;
              }
            }
          }
        } catch (e) { console.warn('[VoiceCommand] NLU interim error:', e); }
      }
    },
    [executeIntent, extractStepNumberForOnnx, findBestScene, seekToScene, showFeedback],
  );

  const handleFinalResult = useCallback(
    async (text: string) => {
      if (handledInInterimRef.current) {
        handledInInterimRef.current = false;
        return;
      }
      if (!text.trim()) return;
      const tE2E = performance.now();
      setTranscript(text);

      // 1. 키워드 매칭
      const tKeyword0 = performance.now();
      const localResult = classifyLocal(text);
      const tKeyword1 = performance.now();
      if (localResult) {
        console.log(`[Perf:keyword] final "${text}" → ${localResult.intent} | ${(tKeyword1 - tKeyword0).toFixed(1)}ms`);
        executeIntent(localResult.intent, localResult.payload);
        console.log(`[Perf:E2E] final "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
        return;
      }

      // 2. NLU 추론
      if (nluReadyRef.current && nluRef.current) {
        try {
          const tNlu0 = performance.now();
          const result = await nluRef.current.classify(text);
          const tNlu1 = performance.now();
          console.log(`[Perf:NLU] final "${text}" → ${result?.intent ?? 'none'}(${((result?.confidence ?? 0) * 100).toFixed(1)}%) | ${(tNlu1 - tNlu0).toFixed(1)}ms`);

          if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
            if (result.intent === 'GO_TO_SCENE') {
              setSceneSearching(true);
            } else {
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumberForOnnx(text) : undefined;
              executeIntent(result.intent, { stepNumber: stepNum });
              console.log(`[Perf:E2E] final "${text}" → 명령 실행 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
              return;
            }
          }
        } catch (e) { console.warn('[VoiceCommand] NLU final error:', e); }
      }

      // 3. 씬 매칭 (embed + cosine)
      const tScene0 = performance.now();
      const sceneMatch = await findBestScene(text);
      const tScene1 = performance.now();
      setSceneSearching(false);
      console.log(`[Perf:scene] final "${text}" → ${sceneMatch?.label ?? 'no match'} | ${(tScene1 - tScene0).toFixed(1)}ms`);
      if (sceneMatch) {
        seekToScene(sceneMatch.index);
        showFeedback(sceneMatch.label, 'GO_TO_SCENE');
        console.log(`[Perf:E2E] final "${text}" → 장면 이동 | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
      } else {
        console.log(`[Perf:E2E] final "${text}" → no match | STT후: ${(performance.now() - tE2E).toFixed(1)}ms | VAD부터: ${(performance.now() - (vadSpeechStartRef.current || tE2E)).toFixed(0)}ms`);
      }
    },
    [executeIntent, extractStepNumberForOnnx, findBestScene, seekToScene, showFeedback],
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
    vadSpeechStartRef,
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
    sceneSearching,
    toggleListening,
    stopListening,
    handleWebViewMessage,
    onWebViewReady,
  };
}
