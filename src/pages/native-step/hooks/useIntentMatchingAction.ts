/**
 * useIntentMatchingAction — 음성 의도(intent)를 실제 액션에 매핑하는 훅.
 *
 * 순수한 intent → action mapper. tracking/analytics는 호출자(페이지)가 담당.
 * 하나의 HandleIntentFn 함수를 반환한다. UI 상태 없음.
 */

import { useCallback } from 'react';
import type { useStepNavigation } from './useStepNavigation';
import type { useVideoControl } from './useVideoControl';
import type { IntentLabel } from './onnxNLU';

export type HandleIntentFn = (
  intent: IntentLabel,
  payload?: { stepNumber?: number; sceneNumber?: number; durationSec?: number },
) => { text: string; intent: string } | null;

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

type UseIntentMatchingActionOptions = {
  stepNav: ReturnType<typeof useStepNavigation>;
  videoControl: ReturnType<typeof useVideoControl>;
  timerResult: any;
  currentStepTitle: string | undefined;
  currentStepIndex: number;
  sceneLabelsLength: number;
};

export function useIntentMatchingAction({
  stepNav,
  videoControl,
  timerResult,
  currentStepTitle,
  currentStepIndex,
  sceneLabelsLength,
}: UseIntentMatchingActionOptions): HandleIntentFn {
  return useCallback(
    (intent, payload = {}) => {
      if (intent === 'EXTRA') return null;

      switch (intent) {
        case 'NEXT_STEP': {
          if (stepNav.isLastStep) return { text: '마지막 단계예요', intent: 'NEXT_STEP' };
          stepNav.goToNextStep();
          return { text: '다음 단계 →', intent: 'NEXT_STEP' };
        }
        case 'PREV_STEP': {
          if (stepNav.isFirstStep) return { text: '첫 번째 단계예요', intent: 'PREV_STEP' };
          stepNav.goToPrevStep();
          return { text: '← 이전 단계', intent: 'PREV_STEP' };
        }
        case 'GO_TO_STEP': {
          const n = payload.stepNumber;
          if (n && n >= 1 && n <= stepNav.totalSteps) {
            stepNav.goToStep(n);
            return { text: `${n}단계로 이동`, intent: 'GO_TO_STEP' };
          }
          return { text: `${n}단계는 없어요`, intent: 'GO_TO_STEP' };
        }
        case 'GO_TO_SCENE_NUMBER': {
          const n = payload.sceneNumber;
          if (n && n >= 1 && n <= sceneLabelsLength) {
            stepNav.seekToSceneNumber(n);
            return { text: `${n}번 장면`, intent: 'GO_TO_SCENE_NUMBER' };
          }
          return { text: `${n}번 장면은 없어요`, intent: 'GO_TO_SCENE_NUMBER' };
        }
        case 'GO_TO_SCENE': {
          // NLU 비활성화로 사실상 dead code — 키워드 매칭은 GO_TO_SCENE_NUMBER만 발화
          return { text: '장면 번호로 말해주세요', intent: 'GO_TO_SCENE' };
        }
        case 'PLAY': {
          videoControl.playVideo();
          return { text: '▶ 재생', intent: 'PLAY' };
        }
        case 'PAUSE': {
          videoControl.pauseVideo();
          return { text: '⏸ 일시정지', intent: 'PAUSE' };
        }
        case 'TIMER_START': {
          const sec = payload.durationSec;
          if (sec && sec > 0) {
            const stepName = currentStepTitle ?? `${currentStepIndex + 1}단계`;
            timerResult.addTimer(stepName, sec);
            return { text: `⏱ ${formatDuration(sec)} 타이머`, intent: 'TIMER_START' };
          }
          return null; // duration unknown
        }
        case 'TIMER_CANCEL': {
          timerResult.cancelTimer();
          return { text: '⏱ 타이머 취소', intent: 'TIMER_CANCEL' };
        }
        case 'TIMER_PAUSE': {
          timerResult.pauseTimer();
          return { text: '⏱ 타이머 일시정지', intent: 'TIMER_PAUSE' };
        }
        case 'TIMER_RESUME': {
          timerResult.resumeTimer();
          return { text: '⏱ 타이머 재개', intent: 'TIMER_RESUME' };
        }
        default:
          return null;
      }
    },
    [
      stepNav, videoControl, timerResult,
      currentStepTitle, currentStepIndex, sceneLabelsLength,
    ],
  );
}
