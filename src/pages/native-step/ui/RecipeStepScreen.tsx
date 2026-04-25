import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type WebViewMessageEvent } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { useStepNavigation } from '@/src/pages/native-step/hooks/useStepNavigation';
import { useVideoControl } from '@/src/pages/native-step/hooks/useVideoControl';
import { useIntentMatchingAction, type HandleIntentFn } from '@/src/pages/native-step/hooks/useIntentMatchingAction';
import { useVoiceCommand } from '@/src/pages/native-step/hooks/useVoiceCommand';
import { useStepTimer } from '@/src/pages/native-step/hooks/useStepTimer';
import { type TimerSheetRef } from '@/src/pages/native-step/components/TimerBottomSheet';
import { track, CookingModeEvents, CookingCommandDetails } from '@/src/shared/analytics';
import type { IntentLabel } from '@/src/pages/native-step/hooks/onnxNLU';

// Voice intent → cooking_mode_command (type, detail) 매핑.
// 페이지 레벨에 두는 이유: amplitude 트래킹 로직을 hook 안에 묻지 않기 위함.
const INTENT_TO_COMMAND: Partial<Record<IntentLabel, {
  type: 'navigation' | 'video_control' | 'timer';
  detail: string;
}>> = {
  NEXT_STEP: { type: 'navigation', detail: CookingCommandDetails.NEXT },
  PREV_STEP: { type: 'navigation', detail: CookingCommandDetails.PREV },
  GO_TO_STEP: { type: 'navigation', detail: CookingCommandDetails.STEP },
  GO_TO_SCENE_NUMBER: { type: 'navigation', detail: CookingCommandDetails.GO_TO_SCENE_NUMBER },
  PLAY: { type: 'video_control', detail: CookingCommandDetails.VIDEO_PLAY },
  PAUSE: { type: 'video_control', detail: CookingCommandDetails.VIDEO_STOP },
  TIMER_START: { type: 'timer', detail: CookingCommandDetails.TIMER_START },
  TIMER_CANCEL: { type: 'timer', detail: CookingCommandDetails.TIMER_CANCEL },
  TIMER_PAUSE: { type: 'timer', detail: CookingCommandDetails.TIMER_PAUSE },
  TIMER_RESUME: { type: 'timer', detail: CookingCommandDetails.TIMER_RESUME },
};
import { YOUTUBE_URL } from './constants';
import { ShortsStepScreen } from './shorts-step-screen';
import { NormalStepScreen } from './normal-step-screen';
import type { Scene, StepScreenSharedProps } from './types';

type RecipeStepScreenProps = {
  recipeId: string;
  videoId: string;
  recipe: any;
  isShorts?: boolean;
}

export function RecipeStepScreen({ recipeId, videoId, recipe, isShorts = false }: RecipeStepScreenProps) {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);

  // ─── YouTube WebView 명령 ───
  const postToYouTube = useCallback((msg: object) => {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  // ─── Step Navigation ───
  const stepNav = useStepNavigation({ recipe, postToYouTube });

  // ─── Video Control ───
  const videoControl = useVideoControl(postToYouTube);

  // ─── Timer ───
  const timerSheetRef = useRef<TimerSheetRef>(null);
  const timerResult = useStepTimer({
    recipeId,
    recipeTitle: recipe?.title ?? '',
  });

  const sceneLabels = useMemo(
    () => (stepNav.currentStep?.scenes ?? []).map((s: Scene) => s.label),
    [stepNav.currentStep?.scenes],
  );

  // 앱이 꺼지지 않게 잠금 설정
  useEffect(() => {
    activateKeepAwakeAsync('native-step');
    return () => { deactivateKeepAwake('native-step'); };
  }, []);

  // ─── Cooking mode 트래킹 (start / command / end) ───
  const recipeIdForTrack = recipeId;
  const currentStepIndexRef = useRef(0);

  useEffect(() => { currentStepIndexRef.current = stepNav.currentStepIndex; });

  useEffect(() => {
    track(CookingModeEvents.START, {
      recipe_id: recipeIdForTrack,
      total_steps: stepNav.totalSteps,
    });
    return () => {
      track(CookingModeEvents.END, {
        recipe_id: recipeIdForTrack,
        total_steps: stepNav.totalSteps,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeIdForTrack]);

  const trackCookingCommand = useCallback(
    (
      commandType: 'navigation' | 'video_control' | 'timer' | 'info',
      commandDetail: string,
      triggerMethod: 'voice' | 'touch',
    ) => {
      track(CookingModeEvents.COMMAND, {
        recipe_id: recipeIdForTrack,
        command_type: commandType,
        command_detail: commandDetail,
        trigger_method: triggerMethod,
        current_step: currentStepIndexRef.current,
        current_detail: 0,
      });
    },
    [recipeIdForTrack],
  );

  // ─── Intent Matching (순수 hook - tracking 없음) ───
  const baseIntentHandler = useIntentMatchingAction({
    stepNav,
    videoControl,
    timerResult,
    currentStepTitle: stepNav.currentStep?.title,
    currentStepIndex: stepNav.currentStepIndex,
    sceneLabelsLength: sceneLabels.length,
  });

  // ─── Voice intent wrapper: track('voice') 후 순수 hook에 위임 ───
  const handleVoiceIntent: HandleIntentFn = useCallback((intent, payload) => {
    const cmd = INTENT_TO_COMMAND[intent];
    if (cmd) trackCookingCommand(cmd.type, cmd.detail, 'voice');
    return baseIntentHandler(intent, payload);
  }, [baseIntentHandler, trackCookingCommand]);

  // ─── Voice Command ───
  const {
    isListening,
    transcript,
    intentFeedback,
    pipelineState,
    toggleListening,
    stopListening,
    handleWebViewMessage: voiceHandleMessage,
    onWebViewReady,
  } = useVoiceCommand({
    onIntent: handleVoiceIntent,
    sceneLabels,
    totalSteps: stepNav.totalSteps,
    isFirstStep: stepNav.isFirstStep,
    isLastStep: stepNav.isLastStep,
    webViewRef: webviewRef,
    postToYouTube,
  });

  // ─── Touch wrappers (track('touch') 후 순수 액션 호출) ───
  // ─ Navigation
  const handleManualPrev = useCallback(() => {
    trackCookingCommand('navigation', CookingCommandDetails.PREV, 'touch');
    stepNav.goToPrevStep();
  }, [stepNav.goToPrevStep, trackCookingCommand]);

  const handleManualNext = useCallback(() => {
    trackCookingCommand('navigation', CookingCommandDetails.NEXT, 'touch');
    stepNav.goToNextStep();
  }, [stepNav.goToNextStep, trackCookingCommand]);

  const handleNavigateToStep = useCallback((i: number) => {
    trackCookingCommand('navigation', CookingCommandDetails.STEP, 'touch');
    stepNav.navigateStep(i);
  }, [stepNav.navigateStep, trackCookingCommand]);

  // ─ Video control
  const handleTogglePlay = useCallback(() => {
    const detail = videoControl.isPlaying
      ? CookingCommandDetails.VIDEO_STOP
      : CookingCommandDetails.VIDEO_PLAY;
    trackCookingCommand('video_control', detail, 'touch');
    videoControl.togglePlay();
  }, [videoControl, trackCookingCommand]);

  // ─ Timer (TimerBottomSheet에서 onPress prop으로 사용)
  const handleAddTimerTouch = useCallback((name: string, sec: number) => {
    trackCookingCommand('timer', CookingCommandDetails.TIMER_START, 'touch');
    timerResult.addTimer(name, sec);
  }, [timerResult, trackCookingCommand]);

  const handlePauseTimerTouch = useCallback(() => {
    trackCookingCommand('timer', CookingCommandDetails.TIMER_PAUSE, 'touch');
    timerResult.pauseTimer();
  }, [timerResult, trackCookingCommand]);

  const handleResumeTimerTouch = useCallback(() => {
    trackCookingCommand('timer', CookingCommandDetails.TIMER_RESUME, 'touch');
    timerResult.resumeTimer();
  }, [timerResult, trackCookingCommand]);

  const handleCancelTimerTouch = useCallback(() => {
    trackCookingCommand('timer', CookingCommandDetails.TIMER_CANCEL, 'touch');
    timerResult.cancelTimer();
  }, [timerResult, trackCookingCommand]);

  const handleBack = useCallback(() => {
    stopListening();
    router.back();
  }, [stopListening]);

  // 영상 로드 완료 → 첫 스텝 위치로 이동 + STT 자동 시작 (1회)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (videoControl.isVideoLoaded && !autoStartedRef.current && !isListening) {
      autoStartedRef.current = true;
      // 첫 스텝의 시작 위치로 SEEK
      stepNav.navigateStep(0);
      const t = setTimeout(() => {
        toggleListening();
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [videoControl.isVideoLoaded, isListening, toggleListening, stepNav]);

  // ─── WebView Message ───
  const handleYouTubeMessage = useCallback((event: WebViewMessageEvent) => {
    voiceHandleMessage(event);
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'youtube_state' || data.type === 'YOUTUBE_STATE') {
        videoControl.setIsPlaying(data.state === 1);
      }
    } catch {}
  }, [voiceHandleMessage, videoControl.setIsPlaying]);

  const youtubeUri = `${YOUTUBE_URL}?videoId=${videoId}${isShorts ? '&shorts=1' : ''}`;

  if (!stepNav.currentStep) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 }}>레시피 데이터 없음</Text>
      </View>
    );
  }

  const sharedProps: StepScreenSharedProps = {
    videoId,
    youtubeUri,
    stepNav: {
      steps: stepNav.steps,
      totalSteps: stepNav.totalSteps,
      currentStepIndex: stepNav.currentStepIndex,
      currentStep: stepNav.currentStep,
      isFirstStep: stepNav.isFirstStep,
      isLastStep: stepNav.isLastStep,
      navigateStep: stepNav.navigateStep,
    },
    videoControl: {
      isPlaying: videoControl.isPlaying,
      isVideoLoaded: videoControl.isVideoLoaded,
      setIsVideoLoaded: videoControl.setIsVideoLoaded,
      setIsPlaying: videoControl.setIsPlaying,
      togglePlay: videoControl.togglePlay,
    },
    voiceState: {
      isListening: isListening,
      transcript: transcript,
      pipelineState: pipelineState,
      intentFeedback: intentFeedback,
      toggleListening: toggleListening,
      handleWebViewMessage: voiceHandleMessage,
      onWebViewReady: onWebViewReady,
    },
    timerResult,
    timerSheetRef,
    handleManualPrev,
    handleManualNext,
    handleNavigateToStep,
    handleTogglePlay,
    handleAddTimerTouch,
    handlePauseTimerTouch,
    handleResumeTimerTouch,
    handleCancelTimerTouch,
    handleBack,
    handleYouTubeMessage,
    webviewRef,
  };

  if (isShorts) {
    return <ShortsStepScreen {...sharedProps} />;
  }

  return <NormalStepScreen {...sharedProps} />;
}
