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
import { classifyLocal } from './useLocalNLU';
import { createNLU, type IntentLabel } from './onnxNLU';
import { useSceneMatcher } from './useSceneMatcher';


const NLU_CONFIDENCE_THRESHOLD = 0.7;

interface UseVoiceCommandOptions {
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (stepNumber: number) => void;
  seekToScene: (sceneIndex: number) => void;
  play: () => void;
  pause: () => void;
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
  play,
  pause,
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
    (intent: IntentLabel, stepNumber?: number) => {
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
        case 'GO_TO_STEP':
          if (stepNumber && stepNumber >= 1 && stepNumber <= totalSteps) {
            goToStep(stepNumber); showFeedback(`${stepNumber}단계로 이동`, 'GO_TO_STEP');
          } else { showFeedback(`${stepNumber}단계는 없어요`, 'GO_TO_STEP'); }
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
    [isLastStep, isFirstStep, goToNextStep, goToPrevStep, goToStep, play, pause, totalSteps, showFeedback],
  );

  const extractStepNumber = useCallback((text: string): number | undefined => {
    const digitMatch = text.match(/(\d+)/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const KOREAN_NUMBERS: Record<string, number> = {
      첫: 1, 하나: 1, 한: 1, 일: 1, 두: 2, 둘: 2, 이: 2,
      세: 3, 셋: 3, 삼: 3, 네: 4, 넷: 4, 사: 4, 다섯: 5, 오: 5,
      여섯: 6, 육: 6, 일곱: 7, 칠: 7, 여덟: 8, 팔: 8, 아홉: 9, 구: 9, 열: 10, 십: 10,
    };
    for (const [word, num] of Object.entries(KOREAN_NUMBERS)) {
      if (text.includes(word)) return num;
    }
    return undefined;
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
        const executed = executeIntent(localResult.intent, localResult.stepNumber);
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
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumber(text) : undefined;
              const executed = executeIntent(result.intent, stepNum);
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
    [executeIntent, extractStepNumber, findBestScene, seekToScene, showFeedback],
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
        executeIntent(localResult.intent, localResult.stepNumber);
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
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumber(text) : undefined;
              executeIntent(result.intent, stepNum);
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
    [executeIntent, extractStepNumber, findBestScene, seekToScene, showFeedback],
  );

  // ─── boost words ───
  const boostWords = useMemo(() => {
    const words = new Set<string>([
      '다음', '이전', '재생', '정지', '멈춰', '넘어가', '뒤로', '단계', '플레이', '스탑',
      '장면', '스텝',
      '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십',
      '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
      '첫', '첫번째', '두번째', '세번째', '네번째', '다섯번째',
    ]);
    for (const label of sceneLabels) {
      for (const word of label.split(/\s+/)) {
        const trimmed = word.trim();
        if (trimmed.length >= 2) words.add(trimmed);
      }
    }
    return Array.from(words).slice(0, 100);
  }, [sceneLabels]);

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
