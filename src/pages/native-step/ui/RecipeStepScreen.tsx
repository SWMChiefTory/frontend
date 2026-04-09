import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useVoiceCommand } from '@/src/pages/native-step/hooks/useVoiceCommand';
import { IntentFeedbackToast } from '@/src/pages/native-step/components/IntentFeedbackToast';
import { PawFeedback } from '@/src/pages/native-step/components/PawFeedback';
import { useStepTimer } from '@/src/pages/native-step/hooks/useStepTimer';
import { HeaderTimer, TimerSheet, type TimerSheetRef } from '@/src/pages/native-step/components/TimerBottomSheet';
import { track, CookingModeEvents } from '@/src/shared/analytics';

const YOUTUBE_URL = process.env.EXPO_PUBLIC_YOUTUBE_URL ?? 'http://localhost:3000';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const INJECTED_JS_BRIDGE = `
  (function() {
    if (!window.webkit) window.webkit = {};
    if (!window.webkit.messageHandlers) window.webkit.messageHandlers = {};
    window.webkit.messageHandlers.bridge = {
      postMessage: function(msg) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }
    };
    true;
  })();
`;

type DescriptionItem = {
  content: string;
  start?: string;
}

type Scene = {
  label: string;
  start: string;
  end: string;
}

type RecipeStepScreenProps = {
  videoId: string;
  recipe: any;
  isShorts?: boolean;
}

export function RecipeStepScreen({ videoId, recipe, isShorts = false }: RecipeStepScreenProps) {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);

  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex] ?? steps[0];
  const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const scenes: Scene[] = currentStep?.scenes ?? [];

  // ─── Timer ───
  const timerSheetRef = useRef<TimerSheetRef>(null);
  const timerResult = useStepTimer({
    recipeId: recipe?.id ?? videoId,
    recipeTitle: recipe?.title ?? '',
  });
  const sceneLabels = useMemo(() => scenes.map((s: Scene) => s.label), [scenes]);

  // 앱이 꺼지지 않게 잠금 설정
  useEffect(() => {
    activateKeepAwakeAsync('native-step');
    return () => { deactivateKeepAwake('native-step'); };
  }, []);

  // ─── Cooking mode 트래킹 (웹뷰 컨벤션: start / command / end) ───
  const recipeIdForTrack = String(recipe?.id ?? videoId);
  const currentStepIndexRef = useRef(0);
  const currentSceneIndexRef = useRef(0);
  const sessionStartRef = useRef(0);
  const visitedStepsRef = useRef<Set<number>>(new Set());
  const voiceCommandCountRef = useRef(0);
  const touchCommandCountRef = useRef(0);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
    visitedStepsRef.current.add(currentStepIndex);
  });
  useEffect(() => {
    currentSceneIndexRef.current = activeSceneIndex ?? 0;
  });

  const totalDetails = useMemo(
    () => steps.reduce((acc: number, s: any) => acc + (s?.scenes?.length ?? 0), 0),
    [steps],
  );

  useEffect(() => {
    sessionStartRef.current = Date.now();
    visitedStepsRef.current = new Set([0]);
    voiceCommandCountRef.current = 0;
    touchCommandCountRef.current = 0;
    track(CookingModeEvents.START, {
      recipe_id: recipeIdForTrack,
      total_steps: totalSteps,
      total_details: totalDetails,
    });
    return () => {
      const visited = visitedStepsRef.current.size;
      track(CookingModeEvents.END, {
        recipe_id: recipeIdForTrack,
        duration_seconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
        total_steps: totalSteps,
        visited_steps_unique: visited,
        step_completion_rate:
          totalSteps > 0 ? Math.round((visited / totalSteps) * 100) : 0,
        voice_command_count: voiceCommandCountRef.current,
        touch_command_count: touchCommandCountRef.current,
        command_count: voiceCommandCountRef.current + touchCommandCountRef.current,
        last_step_index: currentStepIndexRef.current,
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
      if (triggerMethod === 'voice') voiceCommandCountRef.current++;
      else touchCommandCountRef.current++;
      track(CookingModeEvents.COMMAND, {
        recipe_id: recipeIdForTrack,
        command_type: commandType,
        command_detail: commandDetail,
        trigger_method: triggerMethod,
        current_step: currentStepIndexRef.current,
        current_detail: currentSceneIndexRef.current,
      });
    },
    [recipeIdForTrack],
  );

  // ─── YouTube WebView 명령 ───
  const postToYouTube = useCallback((msg: object) => {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  const parseTime = useCallback((time: string): number => {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] ?? 0;
  }, []);

  // ─── Step Navigation ───
  const navigateStep = useCallback((i: number, sceneIdx: number = 0) => {
    if (i < 0 || i >= totalSteps) return;
    setCurrentStepIndex(i);
    setActiveSceneIndex(sceneIdx);
    const scene = steps[i]?.scenes?.[sceneIdx];
    if (scene) postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [steps, totalSteps, postToYouTube, parseTime]);

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) navigateStep(currentStepIndex - 1);
  }, [currentStepIndex, navigateStep]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) navigateStep(currentStepIndex + 1);
  }, [currentStepIndex, totalSteps, navigateStep]);

  // ─── Trigger-aware wrappers (트래킹 후 실제 동작 호출) ───
  const handleManualPrev = useCallback(() => {
    trackCookingCommand('navigation', 'PREV', 'touch');
    goToPrevStep();
  }, [goToPrevStep, trackCookingCommand]);

  const handleManualNext = useCallback(() => {
    trackCookingCommand('navigation', 'NEXT', 'touch');
    goToNextStep();
  }, [goToNextStep, trackCookingCommand]);

  const voiceGoToNext = useCallback(() => {
    trackCookingCommand('navigation', 'NEXT', 'voice');
    goToNextStep();
  }, [goToNextStep, trackCookingCommand]);

  const voiceGoToPrev = useCallback(() => {
    trackCookingCommand('navigation', 'PREV', 'voice');
    goToPrevStep();
  }, [goToPrevStep, trackCookingCommand]);

  const voiceGoToStep = useCallback((stepNumber: number) => {
    trackCookingCommand('navigation', 'STEP', 'voice');
    const idx = stepNumber - 1;
    if (idx >= 0 && idx < totalSteps) navigateStep(idx);
  }, [totalSteps, navigateStep, trackCookingCommand]);

  const voiceSeekToScene = useCallback((i: number) => {
    trackCookingCommand('navigation', 'GO_TO_SCENE', 'voice');
    const scene = currentStep?.scenes?.[i];
    if (scene) {
      postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY_VIDEO' });
      setActiveSceneIndex(i);
    }
  }, [currentStep, postToYouTube, parseTime, trackCookingCommand]);

  // 음성: "1번 장면", "2번", "장면 3" → 1-indexed
  const voiceSeekToSceneNumber = useCallback((sceneNum: number) => {
    trackCookingCommand('navigation', 'GO_TO_SCENE_NUMBER', 'voice');
    const idx = sceneNum - 1;
    const scene = currentStep?.scenes?.[idx];
    if (scene) {
      postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY_VIDEO' });
      setActiveSceneIndex(idx);
    }
  }, [currentStep, postToYouTube, parseTime, trackCookingCommand]);

  // 타이머 음성 액션
  const voiceStartTimer = useCallback((durationSec: number) => {
    trackCookingCommand('timer', 'TIMER_START', 'voice');
    const stepName = currentStep?.title ?? `${currentStepIndex + 1}단계`;
    timerResult.addTimer(stepName, durationSec);
  }, [currentStep, currentStepIndex, timerResult, trackCookingCommand]);

  const voiceCancelTimer = useCallback(() => {
    trackCookingCommand('timer', 'TIMER_CANCEL', 'voice');
    timerResult.cancelTimer();
  }, [timerResult, trackCookingCommand]);

  const voicePauseTimer = useCallback(() => {
    trackCookingCommand('timer', 'TIMER_PAUSE', 'voice');
    timerResult.pauseTimer();
  }, [timerResult, trackCookingCommand]);

  const voiceResumeTimer = useCallback(() => {
    trackCookingCommand('timer', 'TIMER_RESUME', 'voice');
    timerResult.resumeTimer();
  }, [timerResult, trackCookingCommand]);

  const voicePlayVideo = useCallback(() => {
    trackCookingCommand('video_control', 'VIDEO_PLAY', 'voice');
    postToYouTube({ type: 'PLAY_VIDEO' });
    setIsPlaying(true);
  }, [postToYouTube, trackCookingCommand]);

  const voicePauseVideo = useCallback(() => {
    trackCookingCommand('video_control', 'VIDEO_STOP', 'voice');
    postToYouTube({ type: 'PAUSE_VIDEO' });
    setIsPlaying(false);
  }, [postToYouTube, trackCookingCommand]);

  const goToStep = useCallback((stepNumber: number) => {
    const idx = stepNumber - 1;
    if (idx >= 0 && idx < totalSteps) navigateStep(idx);
  }, [totalSteps, navigateStep]);

  const seekToScene = useCallback((i: number) => {
    const scene = currentStep?.scenes?.[i];
    if (scene) {
      postToYouTube({ type: 'SEEK_TO', seconds: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY_VIDEO' });
      setActiveSceneIndex(i);
    }
  }, [currentStep, postToYouTube, parseTime]);

  const playVideo = useCallback(() => {
    postToYouTube({ type: 'PLAY_VIDEO' });
    setIsPlaying(true);
  }, [postToYouTube]);

  const pauseVideo = useCallback(() => {
    postToYouTube({ type: 'PAUSE_VIDEO' });
    setIsPlaying(false);
  }, [postToYouTube]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      trackCookingCommand('video_control', 'VIDEO_STOP', 'touch');
      pauseVideo();
    } else {
      trackCookingCommand('video_control', 'VIDEO_PLAY', 'touch');
      playVideo();
    }
  }, [isPlaying, playVideo, pauseVideo, trackCookingCommand]);

  const handleManualSeekScene = useCallback((i: number) => {
    trackCookingCommand('navigation', 'GO_TO_SCENE', 'touch');
    seekToScene(i);
  }, [seekToScene, trackCookingCommand]);

  // ─── Volume Ducking (음성 인식 중 영상 볼륨 줄이기) ───
  const setVideoVolume = useCallback((volume: number) => {
    postToYouTube({ type: 'SET_VOLUME', volume });
  }, [postToYouTube]);

  const onVoiceStart = useCallback(() => {
    setVideoVolume(0);
  }, [setVideoVolume]);

  const onVoiceEnd = useCallback(() => {
    setVideoVolume(1);
  }, [setVideoVolume]);

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
    goToNextStep: voiceGoToNext,
    goToPrevStep: voiceGoToPrev,
    goToStep: voiceGoToStep,
    seekToScene: voiceSeekToScene,
    seekToSceneNumber: voiceSeekToSceneNumber,
    play: voicePlayVideo,
    pause: voicePauseVideo,
    startTimer: voiceStartTimer,
    cancelTimer: voiceCancelTimer,
    pauseTimer: voicePauseTimer,
    resumeTimer: voiceResumeTimer,
    sceneLabels,
    totalSteps,
    isFirstStep,
    isLastStep,
    webViewRef: webviewRef,
    onVoiceStart,
    onVoiceEnd,
  });

  // 영상 로드 완료 + STT 준비되면 자동으로 음성 인식 켜기 (1회)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (isVideoLoaded && !autoStartedRef.current && !isListening) {
      autoStartedRef.current = true;
      // WebView ready 이후에 toggle (onWebViewReady 1.5s 딜레이와 정렬)
      const t = setTimeout(() => {
        toggleListening();
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [isVideoLoaded, isListening, toggleListening]);

  // ─── WebView Message ───
  const handleYouTubeMessage = useCallback((event: WebViewMessageEvent) => {
    voiceHandleMessage(event);
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'youtube_state' || data.type === 'YOUTUBE_STATE') {
        setIsPlaying(data.state === 1);
      }
    } catch {}
  }, [voiceHandleMessage]);

  // ─── Swipe Gesture ───
  const translateX = useSharedValue(0);

  const triggerSwipeHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.5;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && !isFirstStep) {
        runOnJS(triggerSwipeHaptic)();
        runOnJS(goToPrevStep)();
      } else if (e.translationX < -SWIPE_THRESHOLD && !isLastStep) {
        runOnJS(triggerSwipeHaptic)();
        runOnJS(goToNextStep)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });


  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleBack = useCallback(() => {
    stopListening();
    router.back();
  }, [stopListening]);

  const youtubeUri = `${YOUTUBE_URL}?videoId=${videoId}${isShorts ? '&shorts=1' : ''}`;

  if (!currentStep) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>레시피 데이터 없음</Text>
      </View>
    );
  }

  const renderDescription = (desc: any) => {
    if (!desc) return null;
    const items = Array.isArray(desc) ? desc : [desc];
    return items.map((item: DescriptionItem | string, i: number) => {
      const text = typeof item === 'string' ? item : item.content;
      return (
        <View key={i} style={styles.descRow}>
          <View style={styles.descNumber}>
            <Text style={styles.descNumberText}>{i + 1}</Text>
          </View>
          <Text style={styles.descText}>{text}</Text>
        </View>
      );
    });
  };

  const { height: screenHeight } = useWindowDimensions();

  // ─── Shorts 레이아웃 ───
  if (isShorts) {
    const VIDEO_HEIGHT = screenHeight * 0.8;
    return (
      <GestureHandlerRootView style={styles.root}>
        {/* 영상 — 위에서부터 80% */}
        <View style={{ height: VIDEO_HEIGHT, backgroundColor: '#000' }}>
          <WebView
            ref={webviewRef}
            source={{ uri: youtubeUri }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="compatibility"
            allowsFullscreenVideo
            originWhitelist={['*']}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JS_BRIDGE}
            onMessage={handleYouTubeMessage}
            onLoad={() => {
              setIsVideoLoaded(true);
              setTimeout(() => onWebViewReady(), 1500);
            }}
          />
        </View>

        {/* 상단 — 백 버튼 + 진행바 */}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, zIndex: 10, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={handleBack}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={1}>
              {currentStepIndex + 1}/{totalSteps}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
            {steps.map((_: any, i: number) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === currentStepIndex ? '#C4632B' : i < currentStepIndex ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </View>
        </View>

        {/* 하단 텍스트 오버레이 — 배경 없음, 스크롤 가능 */}
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 72,
            bottom: Math.max(insets.bottom, 12) + (isListening ? 28 : 0),
            zIndex: 25,
          }}
        >
          <ScrollView
            style={{ maxHeight: screenHeight - insets.top - 100 }}
            showsVerticalScrollIndicator
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            nestedScrollEnabled
            bounces={true}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 26,
                fontWeight: '700',
                lineHeight: 32,
                textShadowColor: 'rgba(0,0,0,0.85)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 6,
              }}
            >
              {currentStep?.title}
            </Text>
            {currentStep?.description && (
              <View style={{ marginTop: 8, gap: 6 }}>
                {(Array.isArray(currentStep.description)
                  ? currentStep.description
                  : [currentStep.description]
                ).map((d: any, i: number) => {
                  const text = typeof d === 'string' ? d : d.content;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#C4632B',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                          {i + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          color: 'rgba(255,255,255,0.95)',
                          fontSize: 18,
                          lineHeight: 26,
                          textShadowColor: 'rgba(0,0,0,0.85)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 6,
                        }}
                      >
                        {text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* STT 인디케이터 — 안전영역 위 */}
        {isListening && (
          <View style={{ position: 'absolute', left: 16, right: 72, bottom: Math.max(insets.bottom, 12), flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 16 }}>
            <View style={[styles.sttDot, pipelineState === 'TRANSCRIBING' ? styles.sttDotActive : styles.sttDotIdle]} />
            <Text style={[styles.sttText, pipelineState === 'TRANSCRIBING' ? styles.sttTextActive : styles.sttTextIdle, { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]} numberOfLines={1}>
              {pipelineState === 'TRANSCRIBING' ? transcript || '듣고 있어요...' : '대기 중'}
            </Text>
          </View>
        )}

        {/* 오른쪽 버튼 — 영상 영역 우측 하단 안쪽 */}
        <View
          style={{
            position: 'absolute',
            right: 8,
            bottom: (screenHeight - VIDEO_HEIGHT) + 12,
            alignItems: 'center',
            gap: 10,
            zIndex: 20,
          }}
        >
          {/* 타이머 — 활성 시 시간 텍스트 길이만큼 자동 확장 */}
          <View style={{ minWidth: 44, height: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>
            <HeaderTimer
              timer={timerResult.timer}
              displayTime={timerResult.displayTime}
              isUrgent={timerResult.isUrgent}
              onPress={() => timerSheetRef.current?.open()}
            />
          </View>

          {/* 재생/정지 */}
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={intentFeedback?.intent === 'PLAY' || intentFeedback?.intent === 'PAUSE'} size={28} direction="right" />
            <Pressable
              onPress={togglePlay}
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            </Pressable>
          </View>

          {/* 마이크 */}
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={intentFeedback?.intent === 'GO_TO_SCENE' || intentFeedback?.intent === 'GO_TO_STEP'} size={28} direction="right" />
            <Pressable
              onPress={isVideoLoaded ? toggleListening : undefined}
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isListening ? 'rgba(74,222,128,0.3)' : '#333', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={isListening ? 'mic' : 'mic-off'} size={18} color={isListening ? '#4ade80' : '#fff'} />
            </Pressable>
          </View>

          {/* 이전 + 다음 붙어있게 */}
          <View style={{ gap: 2 }}>
            <View style={{ overflow: 'visible', position: 'relative' }}>
              <PawFeedback visible={intentFeedback?.intent === 'PREV_STEP'} size={28} direction="right" />
              <Pressable
                onPress={handleManualPrev}
                disabled={isFirstStep}
                style={{ width: 44, height: 44, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: isFirstStep ? '#2a2a2a' : '#333', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-up" size={20} color={isFirstStep ? '#555' : '#fff'} />
              </Pressable>
            </View>
            <View style={{ overflow: 'visible', position: 'relative' }}>
              <PawFeedback visible={intentFeedback?.intent === 'NEXT_STEP'} size={28} direction="right" />
              {isLastStep ? (
                <Pressable onPress={handleBack} style={{ width: 44, height: 44, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={handleManualNext} style={{ width: 44, height: 44, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#C4632B', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <IntentFeedbackToast message={intentFeedback?.text ?? null} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
          <TimerSheet ref={timerSheetRef} timerResult={timerResult} stepName={currentStep?.title ?? '타이머'} />
        </View>
      </GestureHandlerRootView>
    );
  }

  // ─── 일반 레이아웃 ───
  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentStep.title}
          </Text>

          <HeaderTimer
            timer={timerResult.timer}
            displayTime={timerResult.displayTime}
            isUrgent={timerResult.isUrgent}
            onPress={() => timerSheetRef.current?.open()}
          />

          <View style={{ position: 'relative' }}>
            <PawFeedback visible={intentFeedback?.intent === 'GO_TO_SCENE' || intentFeedback?.intent === 'GO_TO_STEP'} size={32} />
          <Pressable
            onPress={isVideoLoaded ? toggleListening : undefined}
            style={[
              styles.micBtn,
              isListening && styles.micBtnActive,
              !isVideoLoaded && styles.micBtnDisabled,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-off'}
              size={20}
              color={!isVideoLoaded ? 'rgba(255,255,255,0.3)' : isListening ? '#4ade80' : '#fff'}
            />
          </Pressable>
          </View>
        </View>

        {/* ─── Timer Mini Bar (헤더 바로 아래, 진행 바 위) ─── */}

        {/* ─── 세그먼트 진행 바 ─── */}
        <View style={styles.progressBar}>
          {steps.map((_: any, i: number) => (
            <Pressable
              key={i}
              onPress={() => navigateStep(i)}
              style={[
                styles.progressSegment,
                i === currentStepIndex
                  ? styles.progressActive
                  : i < currentStepIndex
                    ? styles.progressDone
                    : styles.progressPending,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ─── YouTube 영상 + 재생 FAB ─── */}
      <View style={styles.videoContainer}>
        {!isVideoLoaded && (
          <Animated.View style={styles.videoSkeleton}>
            <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.15)" />
          </Animated.View>
        )}
        <WebView
          ref={webviewRef}
          source={{ uri: youtubeUri }}
          style={[styles.videoWebview, !isVideoLoaded && { opacity: 0 }]}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="compatibility"
          allowsFullscreenVideo
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={INJECTED_JS_BRIDGE}
          onMessage={handleYouTubeMessage}
          onLoad={() => {
            setIsVideoLoaded(true);
            setTimeout(() => onWebViewReady(), 1500);
          }}
          onError={(e) => console.log('[WebView Error]', e.nativeEvent)}
          onHttpError={(e) => console.log('[WebView HTTP Error]', e.nativeEvent)}
        />
        {isVideoLoaded && (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <PawFeedback visible={intentFeedback?.intent === 'PLAY' || intentFeedback?.intent === 'PAUSE'} size={28} />
          <Pressable onPress={togglePlay} style={[styles.playFab, { position: 'relative', top: 0, right: 0 }]}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
          </Pressable>
          </View>
        )}
      </View>

      {/* ─── 콘텐츠 (스와이프) ─── */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.contentWrap, swipeAnimStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentInner}
          >
            <Text style={styles.stepTitle}>{currentStep.title}</Text>

            <View style={styles.descList}>
              {renderDescription(currentStep.description)}
            </View>

          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* ─── Intent Feedback Toast ─── */}
      <IntentFeedbackToast message={intentFeedback?.text ?? null} />

      {/* ─── 하단: 그라디언트 + 네비게이션 ─── */}
      <View style={styles.bottomGradient} pointerEvents="box-none">
        <View style={styles.gradStep1} pointerEvents="none" />
        <View style={styles.gradStep2} pointerEvents="none" />
        <View style={styles.gradStep3} pointerEvents="none" />
        <View style={styles.bottomBar}>
          <View style={{ position: 'relative', overflow: 'visible', zIndex: 100 }}>
            <PawFeedback visible={intentFeedback?.intent === 'PREV_STEP'} size={32} />
            <Pressable
              onPress={handleManualPrev}
              disabled={isFirstStep}
              style={[styles.navBtn, isFirstStep && styles.navBtnHidden]}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={isFirstStep ? 'transparent' : 'rgba(255,255,255,0.8)'} />
              <Text style={[styles.navBtnText, isFirstStep && { color: 'transparent' }]}>이전</Text>
            </Pressable>
          </View>

          {isLastStep ? (
            <Pressable onPress={handleBack} style={styles.completeBtn}>
              <Text style={styles.completeBtnText}>완료</Text>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ position: 'relative', overflow: 'visible', zIndex: 100 }}>
              <PawFeedback visible={intentFeedback?.intent === 'NEXT_STEP'} size={32} />
              <Pressable onPress={handleManualNext} style={styles.navBtn} hitSlop={8}>
                <Text style={styles.navBtnText}>다음</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          )}
        </View>
        <View style={[styles.sttSafeArea, { height: Math.max(insets.bottom, 24) }]}>
          {isListening && (
            <>
              <View style={[styles.sttDot, pipelineState === 'TRANSCRIBING' ? styles.sttDotActive : styles.sttDotIdle]} />
              <Text
                style={[styles.sttText, pipelineState === 'TRANSCRIBING' ? styles.sttTextActive : styles.sttTextIdle]}
                numberOfLines={1}
              >
                {pipelineState === 'TRANSCRIBING'
                  ? transcript || '듣고 있어요...'
                  : '대기 중'}
              </Text>
            </>
          )}
        </View>
      </View>
      {/* ─── Timer Bottom Sheet (최상위 z) ─── */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
        <TimerSheet
          ref={timerSheetRef}
          timerResult={timerResult}
          stepName={currentStep?.title ?? '타이머'}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  micBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  micBtnActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  micBtnDisabled: {
    opacity: 0.4,
  },

  progressBar: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#C4632B' },
  progressDone: { backgroundColor: 'rgba(249,115,22,0.4)' },
  progressPending: { backgroundColor: 'rgba(255,255,255,0.12)' },

  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
  },
  videoWebview: { flex: 1, backgroundColor: '#000' },
  videoSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playFab: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentWrap: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 80,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },

  descList: { gap: 10 },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  descNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C4632B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  descNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  descText: {
    flex: 1,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 23,
  },

  scenesWrap: {
    marginTop: 14,
  },
  scenesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sceneChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sceneChipActive: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderColor: 'rgba(251,146,60,0.5)',
  },
  sceneChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sceneChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  sceneChipTextActive: { color: 'rgb(253,186,116)' },

  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradStep1: { height: 20, backgroundColor: 'rgba(0,0,0,0.15)' },
  gradStep2: { height: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  gradStep3: { height: 12, backgroundColor: 'rgba(0,0,0,0.75)' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sttSafeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sttDot: { width: 6, height: 6, borderRadius: 3 },
  sttDotActive: { backgroundColor: '#22c55e' },
  sttDotIdle: { backgroundColor: '#6b7280' },
  sttText: { fontSize: 12 },
  sttTextActive: { color: 'rgba(255,255,255,0.8)' },
  sttTextIdle: { color: 'rgba(255,255,255,0.35)' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  navBtnHidden: {
    backgroundColor: 'transparent',
  },
  navBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#16a34a',
  },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
