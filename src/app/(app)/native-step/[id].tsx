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
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useVoiceCommand } from '@/src/pages/native-step/hooks/useVoiceCommand';
import { SpeechCaptionBar } from '@/src/pages/native-step/components/SpeechCaptionBar';
import { IntentFeedbackToast } from '@/src/pages/native-step/components/IntentFeedbackToast';

//next base에서 youtube 호출
const YOUTUBE_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL ?? 'http://localhost:3000';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// WebView bridge: webkit.messageHandlers.bridge → ReactNativeWebView.postMessage
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

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const scenes: Scene[] = currentStep?.scenes ?? [];
  const sceneLabels = useMemo(() => scenes.map((s: Scene) => s.label), [scenes]);

  // ─── Wake Lock ───
  useEffect(() => {
    activateKeepAwakeAsync('native-step');
    return () => {
      deactivateKeepAwake('native-step');
    };
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
    sceneSearching,
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

  // ─── WebView Message (YouTube state + audio bridge) ───
  const handleYouTubeMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'youtube_state' || data.type === 'YOUTUBE_STATE') {
        setIsPlaying(data.state === 1);
        return;
      }
    } catch {}
    // voice pipeline도 이 메시지를 처리
    voiceHandleMessage(event);
  }, [voiceHandleMessage]);

  // ─── Swipe Gesture ───
  const translateX = useSharedValue(0);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.4; // dampen
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

  // ─── Back handler ───
  const handleBack = useCallback(() => {
    stopListening();
    router.back();
  }, [stopListening]);

  const youtubeUri = `${YOUTUBE_URL}/video?videoId=${videoId}`;

  if (!currentStep) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.emptyText}>레시피 데이터 없음</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Text style={styles.headerCenter}>
            STEP {currentStep.order ?? currentStepIndex + 1}/{totalSteps}
          </Text>

          <Pressable
            onPress={toggleListening}
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            hitSlop={8}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-off'}
              size={20}
              color={isListening ? '#4ade80' : '#fff'}
            />
          </Pressable>
        </View>

        {/* Step progress bar */}
        <View style={styles.progressBar}>
          {steps.map((_: any, i: number) => (
            <Pressable
              key={i}
              onPress={() => navigateStep(i)}
              style={[
                styles.progressDot,
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

      {/* ─── YouTube WebView ─── */}
      <View style={styles.videoContainer}>
        <WebView
          ref={webviewRef}
          source={{ uri: youtubeUri }}
          style={styles.videoWebview}
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
            setTimeout(() => onWebViewReady(), 1500);
          }}
          onError={(e) => console.log('[WebView Error]', e.nativeEvent)}
          onHttpError={(e) => console.log('[WebView HTTP Error]', e.nativeEvent)}
        />
      </View>

      {/* ─── Step Content (swipeable) ─── */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.scrollWrap, swipeAnimStyle]}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step title */}
            <Text style={styles.stepTitle}>{currentStep.title}</Text>

            {/* Description */}
            <View style={styles.descCard}>
              {Array.isArray(currentStep.description) ? (
                currentStep.description.map((item: DescriptionItem | string, i: number) => (
                  <Text key={i} style={styles.descText}>
                    {typeof item === 'string' ? item : item.content}
                  </Text>
                ))
              ) : currentStep.description ? (
                <Text style={styles.descText}>
                  {String(currentStep.description)}
                </Text>
              ) : null}
            </View>

            {/* Knowledge */}
            {currentStep.knowledge && (
              <View style={styles.knowledgeBox}>
                <Text style={styles.knowledgeContent}>
                  <Text style={styles.knowledgeLabel}>핵심: </Text>
                  {Array.isArray(currentStep.knowledge)
                    ? currentStep.knowledge.join('\n')
                    : currentStep.knowledge}
                </Text>
              </View>
            )}

            {/* Scene chips */}
            {scenes.length > 0 && (
              <View style={styles.scenesWrap}>
                <Text style={styles.scenesLabel}>장면 목록</Text>
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
                        <Text
                          style={[
                            styles.sceneChipText,
                            isActive ? styles.sceneChipTextActive : null,
                          ]}
                        >
                          {scene.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Q&A / Tip */}
            {currentStep.tip && (
              <View style={styles.tipBox}>
                <View style={styles.tipHeader}>
                  <Ionicons name="bulb-outline" size={14} color="rgb(252,211,77)" />
                  <Text style={styles.tipLabel}>Q&A</Text>
                </View>
                {(Array.isArray(currentStep.tip)
                  ? currentStep.tip
                  : [currentStep.tip]
                ).map((t: string, i: number, arr: string[]) => (
                  <Text key={i} style={styles.tipText}>
                    {arr.length > 1 ? `${i + 1}. ` : ''}{t}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* ─── Intent Feedback Toast ─── */}
      <IntentFeedbackToast message={intentFeedback} />

      {/* ─── Bottom Control Bar ─── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(isListening ? 0 : insets.bottom, 12) }]}>
        <Pressable onPress={goToPrevStep} disabled={isFirstStep} style={styles.navBtn} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={isFirstStep ? 'rgba(255,255,255,0.2)' : '#fff'}
          />
          <Text style={[styles.navBtnText, isFirstStep && styles.navBtnDisabled]}>이전</Text>
        </Pressable>

        <Pressable onPress={togglePlay} style={styles.playBtn}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
        </Pressable>

        {isLastStep ? (
          <Pressable onPress={handleBack} style={styles.completeBtn}>
            <Text style={styles.completeBtnText}>완료</Text>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable onPress={goToNextStep} disabled={isLastStep} style={styles.navBtn} hitSlop={8}>
            <Text style={[styles.navBtnText, isLastStep && styles.navBtnDisabled]}>다음</Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isLastStep ? 'rgba(255,255,255,0.2)' : '#fff'}
            />
          </Pressable>
        )}
      </View>

      {/* ─── Speech Caption Bar ─── */}
      <SpeechCaptionBar
        isListening={isListening}
        transcript={transcript}
        pipelineState={pipelineState}
      />
      {isListening && (
        <View style={{ height: insets.bottom, backgroundColor: 'rgba(0,0,0,0.9)' }} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: { color: '#fff', fontSize: 14, fontWeight: '600' },
  micBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  micBtnActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },

  // Progress bar
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },
  progressActive: { backgroundColor: '#f97316' },
  progressDone: { backgroundColor: 'rgba(249,115,22,0.4)' },
  progressPending: { backgroundColor: 'rgba(255,255,255,0.2)' },

  // Video
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoWebview: { flex: 1, backgroundColor: '#000' },

  // Scroll
  scrollWrap: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },

  // Step title
  stepTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Description card
  descCard: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  descText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },

  // Knowledge
  knowledgeBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  knowledgeLabel: { fontWeight: '700', color: 'rgb(147,197,253)', fontSize: 12 },
  knowledgeContent: { color: 'rgb(191,219,254)', fontSize: 12, lineHeight: 18 },

  // Scenes
  scenesWrap: { marginTop: 16 },
  scenesLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scenesRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sceneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sceneChipActive: {
    backgroundColor: 'rgba(249,115,22,0.25)',
    borderColor: 'rgba(251,146,60,0.5)',
  },
  sceneChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sceneChipText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  sceneChipTextActive: { color: 'rgb(253,186,116)' },

  // Tip
  tipBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  tipLabel: { fontSize: 12, fontWeight: '700', color: 'rgb(252,211,77)' },
  tipText: { color: 'rgba(252,211,77,0.9)', fontSize: 12, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#000',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    minWidth: 72,
  },
  navBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  navBtnDisabled: { color: 'rgba(255,255,255,0.2)' },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Complete
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#16a34a',
  },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
