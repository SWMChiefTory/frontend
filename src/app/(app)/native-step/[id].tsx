import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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

export default function RecipeStepPage() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);

  console.log('[StepPage] MOUNTED, params:', Object.keys(params));
  const videoId = (params.videoId as string) ?? '';
  const recipe = useMemo(() => {
    const raw = params.recipe as string | undefined;
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [params.recipe]);

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
  // step 관리 훅은 별도로 관리 하는게 어떨까?
  const navigateStep = useCallback((i: number, sceneIdx: number = 0) => {
    if (i < 0 || i >= totalSteps) return;
    setCurrentStepIndex(i);
    setActiveSceneIndex(sceneIdx);
    const scene = steps[i]?.scenes?.[sceneIdx];
    if (scene) postToYouTube({ type: 'SEEK_TO', time: parseTime(scene.start) });
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
      postToYouTube({ type: 'SEEK_TO', time: parseTime(scene.start) });
      postToYouTube({ type: 'PLAY' });
      setActiveSceneIndex(i);
    }
  }, [currentStep, postToYouTube, parseTime]);

  const playVideo = useCallback(() => {
    postToYouTube({ type: 'PLAY' });
    setIsPlaying(true);
  }, [postToYouTube]);

  const pauseVideo = useCallback(() => {
    postToYouTube({ type: 'PAUSE' });
    setIsPlaying(false);
  }, [postToYouTube]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pauseVideo();
    else playVideo();
  }, [isPlaying, playVideo, pauseVideo]);

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

  // ─── Swipe Gesture (캐러셀 peek) ───
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

  const youtubeUri = `${YOUTUBE_URL}?videoId=${videoId}`;

  if (!currentStep) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.emptyText}>레시피 데이터 없음</Text>
      </View>
    );
  }

  // 설명 텍스트 렌더링 (· 구분자)
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

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        {/* ─── Header: 뒤로 + 단계 제목 + 마이크 ─── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentStep.title}
          </Text>

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
        {/* 재생 FAB */}
        {isVideoLoaded && (
          <Pressable onPress={togglePlay} style={styles.playFab}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* ─── 콘텐츠 (스와이프) ─── */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.contentWrap, swipeAnimStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentInner}
          >
            {/* 단계 제목 */}
            <Text style={styles.stepTitle}>{currentStep.title}</Text>

            {/* 설명 */}
            <View style={styles.descList}>
              {renderDescription(currentStep.description)}
            </View>

            {/* 장면 칩 */}
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
      <IntentFeedbackToast message={intentFeedback} />

      {/* ─── 하단: 그라디언트 + 네비게이션 (항상 고정) ─── */}
      <View style={styles.bottomGradient} pointerEvents="box-none">
        <View style={styles.gradStep1} pointerEvents="none" />
        <View style={styles.gradStep2} pointerEvents="none" />
        <View style={styles.gradStep3} pointerEvents="none" />
        <View style={styles.bottomBar}>
          <Pressable
            onPress={goToPrevStep}
            disabled={isFirstStep}
            style={[styles.navBtn, isFirstStep && styles.navBtnHidden]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={isFirstStep ? 'transparent' : 'rgba(255,255,255,0.8)'} />
            <Text style={[styles.navBtnText, isFirstStep && { color: 'transparent' }]}>이전</Text>
          </Pressable>

          {isLastStep ? (
            <Pressable onPress={handleBack} style={styles.completeBtn}>
              <Text style={styles.completeBtnText}>완료</Text>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </Pressable>
          ) : (
            <Pressable onPress={goToNextStep} style={styles.navBtn} hitSlop={8}>
              <Text style={styles.navBtnText}>다음</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
        {/* safe area: STT 상태 가운데 표시 */}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 },

  // ─── Header ───
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

  // ─── 세그먼트 진행 바 ───
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

  // ─── Video ───
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

  // ─── 콘텐츠 ───
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

  // ─── 설명 ───
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

  // ─── 장면 칩 ───
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

  // ─── 하단 바 ───
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradStep1: {
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  gradStep2: {
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gradStep3: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
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
