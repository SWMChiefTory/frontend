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

interface DescriptionItem {
  content: string;
  start?: string;
}

interface Scene {
  label: string;
  start: string;
  end: string;
}

interface RecipeStepScreenProps {
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
    if (isPlaying) pauseVideo();
    else playVideo();
  }, [isPlaying, playVideo, pauseVideo]);

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
    goToNextStep,
    goToPrevStep,
    goToStep,
    seekToScene,
    play: playVideo,
    pause: pauseVideo,
    sceneLabels,
    totalSteps,
    isFirstStep,
    isLastStep,
    webViewRef: webviewRef,
    onVoiceStart,
    onVoiceEnd,
  });

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

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.5;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && !isFirstStep) {
        runOnJS(goToPrevStep)();
      } else if (e.translationX < -SWIPE_THRESHOLD && !isLastStep) {
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
          <Text style={styles.descDot}>·</Text>
          <Text style={styles.descText}>{text}</Text>
        </View>
      );
    });
  };

  const { height: screenHeight } = useWindowDimensions();

  // ─── Shorts 레이아웃 ───
  if (isShorts) {
    return (
      <GestureHandlerRootView style={styles.root}>
        {/* 영상 — 화면 70% (safe area 포함) */}
        <View style={{ height: screenHeight * 0.7, backgroundColor: '#000' }}>
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

          {/* 오버레이 — 백 버튼 + 진행바 */}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, zIndex: 10, paddingHorizontal: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={handleBack}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
              <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                {currentStepIndex + 1}/{totalSteps}
              </Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
              {steps.map((_: any, i: number) => (
                <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === currentStepIndex ? '#f97316' : i < currentStepIndex ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.15)' }} />
              ))}
            </View>
          </View>
        </View>

        {/* 하단 — 스텝 설명 */}
        <View style={{ flex: 1, backgroundColor: '#000', paddingHorizontal: 16, paddingTop: 12, paddingRight: 64 }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
              {currentStep?.title}
            </Text>
            {currentStep?.description && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 8, lineHeight: 22 }}>
                {Array.isArray(currentStep.description)
                  ? currentStep.description.map((d: any) => d.content).join('\n')
                  : currentStep.description}
              </Text>
            )}
          </ScrollView>
          {isListening && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: Math.max(insets.bottom, 12) }}>
              <View style={[styles.sttDot, pipelineState === 'TRANSCRIBING' ? styles.sttDotActive : styles.sttDotIdle]} />
              <Text style={[styles.sttText, pipelineState === 'TRANSCRIBING' ? styles.sttTextActive : styles.sttTextIdle]} numberOfLines={1}>
                {pipelineState === 'TRANSCRIBING' ? transcript || '듣고 있어요...' : '대기 중'}
              </Text>
            </View>
          )}
        </View>

        {/* 오른쪽 버튼 — 전체 화면 absolute 오버레이 */}
        <View
          style={{
            position: 'absolute',
            right: 8,
            bottom: Math.max(insets.bottom, 16),
            alignItems: 'center',
            gap: 10,
            zIndex: 20,
          }}
        >
          {/* 타이머 */}
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
            <HeaderTimer
              timer={timerResult.timer}
              displayTime={timerResult.displayTime}
              isUrgent={timerResult.isUrgent}
              onPress={() => timerSheetRef.current?.open()}
            />
          </View>

          {/* 재생/정지 */}
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={intentFeedback?.intent === 'PLAY' || intentFeedback?.intent === 'PAUSE'} size={28} />
            <Pressable
              onPress={togglePlay}
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            </Pressable>
          </View>

          {/* 마이크 */}
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={intentFeedback?.intent === 'GO_TO_SCENE' || intentFeedback?.intent === 'GO_TO_STEP'} size={28} />
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
              <PawFeedback visible={intentFeedback?.intent === 'PREV_STEP'} size={28} />
              <Pressable
                onPress={goToPrevStep}
                disabled={isFirstStep}
                style={{ width: 44, height: 44, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: isFirstStep ? '#2a2a2a' : '#333', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-up" size={20} color={isFirstStep ? '#555' : '#fff'} />
              </Pressable>
            </View>
            <View style={{ overflow: 'visible', position: 'relative' }}>
              <PawFeedback visible={intentFeedback?.intent === 'NEXT_STEP'} size={28} />
              {isLastStep ? (
                <Pressable onPress={handleBack} style={{ width: 44, height: 44, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={goToNextStep} style={{ width: 44, height: 44, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <IntentFeedbackToast message={intentFeedback?.text ?? null} />
        <TimerSheet ref={timerSheetRef} timerResult={timerResult} stepName={currentStep?.title ?? '타이머'} />
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

            {scenes.length > 0 && (
              <View style={styles.scenesWrap}>
                <View style={styles.scenesRow}>
                  {scenes.map((scene: Scene, i: number) => {
                    const isActive = i === activeSceneIndex;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => seekToScene(i)}
                        style={[
                          styles.sceneChip,
                          isActive ? styles.sceneChipActive : styles.sceneChipInactive,
                        ]}
                      >
                        <Text style={[styles.sceneChipText, isActive && styles.sceneChipTextActive]}>
                          {i + 1}. {scene.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
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
              onPress={goToPrevStep}
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
              <Pressable onPress={goToNextStep} style={styles.navBtn} hitSlop={8}>
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
      {/* ─── Timer Bottom Sheet ─── */}
      <TimerSheet
        ref={timerSheetRef}
        timerResult={timerResult}
        stepName={currentStep?.title ?? '타이머'}
      />
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
  progressActive: { backgroundColor: '#f97316' },
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

  descList: { gap: 8 },
  descRow: { flexDirection: 'row', alignItems: 'flex-start' },
  descDot: {
    color: '#f97316',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
    marginTop: 0,
  },
  descText: {
    flex: 1,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    lineHeight: 26,
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
