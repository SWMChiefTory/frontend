/**
 * useStepTimer – Zustand 전역 타이머 스토어
 *
 * endAt 기반 카운트다운 + 알림/Live Activity 재사용
 * 웹뷰, 네이티브 Step 페이지 어디서든 접근 가능
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { scheduleTimerAlarm, cancelTimerAlarm } from '@/src/modules/timer/notifications/timerNotifications';
import { startActivity, pauseActivity, resumeActivity, endActivity } from '@/src/modules/timer/live-activity/liveActivity';
import { useMarketStore } from '@/src/shared/store/marketStore';

export type TimerState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'FINISHED';

export type Timer = {
  id: string;
  name: string;
  duration: number;        // 총 시간 (초)
  endAt: number | null;    // ACTIVE 시 종료 시각 (Date.now() ms)
  remainingTime: number;   // PAUSED 시 남은 시간 (초)
  state: TimerState;
}

// ─── Zustand Store (persist) ───
type TimerStore = {
  timer: Timer | null;
  isSheetOpen: boolean;

  setTimer: (timer: Timer | null) => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set) => ({
      timer: null,
      isSheetOpen: false,

      setTimer: (timer) => set({ timer }),
      openSheet: () => set({ isSheetOpen: true }),
      closeSheet: () => set({ isSheetOpen: false }),
    }),
    {
      name: 'cheftory.timer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ timer: state.timer }),
    },
  ),
);

// ─── 타이머 액션 (스토어 외부에서 호출 가능) ───
let idCounter = 0;

export function startTimerAction(opts: {
  name: string;
  seconds: number;
  recipeId: string;
  recipeTitle: string;
  market: string | null;
}) {
  // 기존 타이머가 있으면 notification + Live Activity 정리
  const prev = useTimerStore.getState().timer;
  if (prev) {
    cancelTimerAlarm({ timerId: prev.id });
    endActivity({ timerId: prev.id });
  }

  const id = `timer-${Date.now()}-${++idCounter}`;
  const endAt = Date.now() + opts.seconds * 1000;
  const newTimer: Timer = {
    id,
    name: opts.name,
    duration: opts.seconds,
    endAt,
    remainingTime: opts.seconds,
    state: 'ACTIVE',
  };

  useTimerStore.getState().setTimer(newTimer);

  scheduleTimerAlarm(id, opts.recipeId, `${opts.name} - ${opts.recipeTitle}`, opts.seconds, opts.market as any);
  startActivity({
    timerId: id,
    activityName: `${opts.name} - ${opts.recipeTitle}`,
    endAt,
    recipeId: opts.recipeId,
  });

  return id;
}

export function pauseTimerAction() {
  const timer = useTimerStore.getState().timer;
  if (!timer || timer.state !== 'ACTIVE' || !timer.endAt) return;

  const remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
  const paused: Timer = { ...timer, state: 'PAUSED', endAt: null, remainingTime: remaining };

  useTimerStore.getState().setTimer(paused);

  cancelTimerAlarm({ timerId: timer.id });
  pauseActivity({
    timerId: timer.id,
    startedAt: null,
    pausedAt: Date.now(),
    duration: timer.duration,
    remainingTime: remaining,
  });
}

export function resumeTimerAction(opts: { recipeId: string; recipeTitle: string; market: string | null }) {
  const timer = useTimerStore.getState().timer;
  if (!timer || timer.state !== 'PAUSED') return;

  const endAt = Date.now() + timer.remainingTime * 1000;
  const resumed: Timer = { ...timer, state: 'ACTIVE', endAt };

  useTimerStore.getState().setTimer(resumed);

  scheduleTimerAlarm(timer.id, opts.recipeId, `${timer.name} - ${opts.recipeTitle}`, timer.remainingTime, opts.market as any);
  resumeActivity({
    timerId: timer.id,
    startedAt: Date.now(),
    duration: timer.duration,
    endAt,
  });
}

export function cancelTimerAction() {
  const timer = useTimerStore.getState().timer;
  if (!timer) return;

  cancelTimerAlarm({ timerId: timer.id });
  endActivity({ timerId: timer.id });
  useTimerStore.getState().setTimer(null);
}

export function finishTimerAction() {
  const timer = useTimerStore.getState().timer;
  if (!timer) return;

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  useTimerStore.getState().setTimer({ ...timer, state: 'FINISHED', remainingTime: 0 });
  endActivity({ timerId: timer.id });
}

export function dismissFinishedAction() {
  useTimerStore.getState().setTimer(null);
}

// ─── Hook (컴포넌트에서 사용) ───
export type StepTimerResult = {
  timer: Timer | null;
  displayTime: string;
  progress: number;
  isUrgent: boolean;
  isFinished: boolean;
  isSheetOpen: boolean;
  addTimer: (name: string, seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  dismissFinished: () => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export function useStepTimer({
  recipeId,
  recipeTitle,
}: {
  recipeId: string;
  recipeTitle: string;
}): StepTimerResult {
  const timer = useTimerStore((s) => s.timer);
  const isSheetOpen = useTimerStore((s) => s.isSheetOpen);
  const openSheet = useTimerStore((s) => s.openSheet);
  const closeSheet = useTimerStore((s) => s.closeSheet);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const { market } = useMarketStore();

  // 200ms polling
  useEffect(() => {
    const interval = setInterval(() => {
      const t = useTimerStore.getState().timer;
      if (!t || t.state !== 'ACTIVE' || !t.endAt) return;

      const remaining = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        finishTimerAction();
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // AppState
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const t = useTimerStore.getState().timer;
        if (t?.state === 'ACTIVE' && t.endAt) {
          setRemainingSeconds(Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000)));
        }
      }
    });
    return () => sub.remove();
  }, []);

  const addTimer = useCallback((name: string, seconds: number) => {
    startTimerAction({ name, seconds, recipeId, recipeTitle, market });
    setRemainingSeconds(seconds);
  }, [recipeId, recipeTitle, market]);

  const pauseTimer = useCallback(() => {
    pauseTimerAction();
    const t = useTimerStore.getState().timer;
    if (t) setRemainingSeconds(t.remainingTime);
  }, []);

  const resumeTimer = useCallback(() => {
    resumeTimerAction({ recipeId, recipeTitle, market });
  }, [recipeId, recipeTitle, market]);

  const seconds = timer?.state === 'PAUSED' ? timer.remainingTime : remainingSeconds;
  const displayTime = timer?.state === 'FINISHED'
    ? '완료!'
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  const progress = timer
    ? timer.state === 'FINISHED' ? 1 : 1 - seconds / timer.duration
    : 0;

  return {
    timer,
    displayTime,
    progress,
    isUrgent: timer?.state === 'ACTIVE' && seconds > 0 && seconds <= 20,
    isFinished: timer?.state === 'FINISHED',
    isSheetOpen,
    addTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer: cancelTimerAction,
    dismissFinished: dismissFinishedAction,
    openSheet,
    closeSheet,
  };
}
