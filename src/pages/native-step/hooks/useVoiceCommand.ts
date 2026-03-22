/**
 * useVoiceCommand – 웹뷰 AEC 기반 음성 명령
 *
 * WebView getUserMedia(echoCancellation:true) → bridge PCM 청크
 *   → Silero VAD + expo-speech-transcriber
 *   → NLU(키워드 + ONNX) + 임베딩 장면 매칭
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';
import { useWebAudioPipeline } from './useWebAudioPipeline';
import { classifyLocal } from './useLocalNLU';
import { createNLU, type IntentLabel } from './onnxNLU';
import { useSceneMatcher } from './useSceneMatcher';

const COMMAND_LABELS: Record<string, string> = {
  NEXT_STEP: '다음 단계 →',
  PREV_STEP: '← 이전 단계',
  PLAY: '▶ 재생',
  PAUSE: '⏸ 일시정지',
  GO_TO_STEP: '단계 이동',
  GO_TO_SCENE: '장면 이동',
  EXTRA: '',
};

const DEBOUNCE_MS = 1500;
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
}: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [intentFeedback, setIntentFeedback] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [sceneSearching, setSceneSearching] = useState(false);
  const lastIntentTimeRef = useRef(0);
  const lastIntentRef = useRef<string>('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);
  const handledInInterimRef = useRef(false);

  const nluReadyRef = useRef(false);

  useEffect(() => {
    createNLU()
      .then(() => {
        nluReadyRef.current = true;
        console.log('[VoiceCommand] NLU model ready');
      })
      .catch((e) => console.warn('[VoiceCommand] NLU model load failed:', e));
  }, []);

  const { findBestScene } = useSceneMatcher(sceneLabels);

  const showFeedback = useCallback((text: string) => {
    setIntentFeedback(text);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setIntentFeedback(null), 1800);
  }, []);

  const canExecute = useCallback((intent: string): boolean => {
    const now = Date.now();
    if (intent === lastIntentRef.current && now - lastIntentTimeRef.current < DEBOUNCE_MS) {
      return false;
    }
    lastIntentRef.current = intent;
    lastIntentTimeRef.current = now;
    return true;
  }, []);

  const executeIntent = useCallback(
    (intent: IntentLabel, stepNumber?: number) => {
      if (intent === 'EXTRA') return false;
      if (!canExecute(intent + (stepNumber ?? ''))) return false;

      switch (intent) {
        case 'NEXT_STEP':
          if (isLastStep) { showFeedback('마지막 단계예요'); }
          else { goToNextStep(); showFeedback(COMMAND_LABELS.NEXT_STEP); }
          break;
        case 'PREV_STEP':
          if (isFirstStep) { showFeedback('첫 번째 단계예요'); }
          else { goToPrevStep(); showFeedback(COMMAND_LABELS.PREV_STEP); }
          break;
        case 'GO_TO_STEP':
          if (stepNumber && stepNumber >= 1 && stepNumber <= totalSteps) {
            goToStep(stepNumber); showFeedback(`${stepNumber}단계로 이동`);
          } else { showFeedback(`${stepNumber}단계는 없어요`); }
          break;
        case 'PLAY':
          play(); showFeedback(COMMAND_LABELS.PLAY);
          break;
        case 'PAUSE':
          pause(); showFeedback(COMMAND_LABELS.PAUSE);
          break;
        case 'GO_TO_SCENE':
          return false;
      }
      return true;
    },
    [canExecute, isLastStep, isFirstStep, goToNextStep, goToPrevStep, goToStep, play, pause, totalSteps, showFeedback],
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
      setTranscript(text);

      const localResult = classifyLocal(text);
      if (localResult) {
        console.log(`[Interim] Tier1 keyword: "${text}" → ${localResult.intent}`);
        const executed = executeIntent(localResult.intent, localResult.stepNumber);
        if (executed) {
          handledInInterimRef.current = true;
          resetTranscriptionRef.current();
          return;
        }
      }

      if (nluReadyRef.current) {
        try {
          const nlu = await createNLU();
          const result = await nlu.classify(text);
          if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
            if (result.intent === 'GO_TO_SCENE') {
              setSceneSearching(true);
              const sceneMatch = await findBestScene(text);
              setSceneSearching(false);
              if (sceneMatch) {
                seekToScene(sceneMatch.index);
                showFeedback(sceneMatch.label);
                handledInInterimRef.current = true;
                resetTranscriptionRef.current();
                return;
              }
            } else {
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumber(text) : undefined;
              const executed = executeIntent(result.intent, stepNum);
              if (executed) {
                handledInInterimRef.current = true;
                resetTranscriptionRef.current();
                return;
              }
            }
          }
        } catch {}
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
      setTranscript(text);

      const localResult = classifyLocal(text);
      if (localResult) {
        executeIntent(localResult.intent, localResult.stepNumber);
        return;
      }

      if (nluReadyRef.current) {
        try {
          const nlu = await createNLU();
          const result = await nlu.classify(text);
          if (result && result.confidence >= NLU_CONFIDENCE_THRESHOLD) {
            if (result.intent === 'GO_TO_SCENE') {
              setSceneSearching(true);
            } else {
              const stepNum = result.intent === 'GO_TO_STEP' ? extractStepNumber(text) : undefined;
              executeIntent(result.intent, stepNum);
              return;
            }
          }
        } catch {}
      }

      const sceneMatch = await findBestScene(text);
      setSceneSearching(false);
      if (sceneMatch) {
        seekToScene(sceneMatch.index);
        showFeedback(sceneMatch.label);
      }
    },
    [executeIntent, extractStepNumber, findBestScene, seekToScene, showFeedback],
  );

  // ─── 장면 라벨 → boost words ───
  const boostWords = useMemo(() => {
    const words = new Set<string>([
      '다음', '이전', '재생', '정지', '멈춰', '넘어가', '뒤로', '단계', '플레이', '스탑',
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
  } = useWebAudioPipeline({
    onInterimResult: handleInterimResult,
    onFinalResult: handleFinalResult,
    boostWords,
    webViewRef,
  });

  resetTranscriptionRef.current = resetTranscription;

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
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
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
