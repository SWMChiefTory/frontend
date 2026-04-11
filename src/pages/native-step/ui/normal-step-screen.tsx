import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { IntentFeedbackToast } from '@/src/pages/native-step/components/IntentFeedbackToast';
import { PawFeedback } from '@/src/pages/native-step/components/PawFeedback';
import { HeaderTimer, TimerSheet } from '@/src/pages/native-step/components/TimerBottomSheet';
import { INJECTED_JS_BRIDGE } from './constants';
import type { StepScreenSharedProps, DescriptionItem } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

function DescriptionList({ items, onSeek }: { items: (DescriptionItem | string)[] | null | undefined; onSeek?: (seconds: number) => void }) {
  if (!items) return null;
  const list = Array.isArray(items) ? items : [items];
  return (
    <>
      {list.map((item: DescriptionItem | string, i: number) => {
        const text = typeof item === 'string' ? item : item.content;
        const start = typeof item === 'string' ? undefined : item.start;
        const hasTiming = !!start && onSeek;
        return (
          <Pressable
            key={i}
            onPress={() => {
              if (hasTiming) {
                const parts = start.split(':').map(Number);
                const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                  : parts.length === 2 ? parts[0] * 60 + parts[1]
                  : parts[0] ?? 0;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSeek(seconds);
              }
            }}
            style={[styles.descRow, hasTiming && { opacity: 1 }]}
          >
            <View style={styles.descNumber}>
              <Text style={styles.descNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.descText}>{text}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

export function NormalStepScreen(props: StepScreenSharedProps) {
  const {
    youtubeUri,
    stepNav,
    videoControl,
    voiceState,
    handleManualPrev,
    handleManualNext,
    handleBack,
    handleYouTubeMessage,
    timerSheetRef,
    timerResult,
    webviewRef,
  } = props;

  const insets = useSafeAreaInsets();

  // ─── Swipe Gesture (normal-only) ───
  const translateX = useSharedValue(0);

  const triggerSwipeHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.5;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && !stepNav.isFirstStep) {
        runOnJS(triggerSwipeHaptic)();
        runOnJS(handleManualPrev)();
      } else if (e.translationX < -SWIPE_THRESHOLD && !stepNav.isLastStep) {
        runOnJS(triggerSwipeHaptic)();
        runOnJS(handleManualNext)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {stepNav.currentStep.title}
          </Text>

          <HeaderTimer
            timer={timerResult.timer}
            displayTime={timerResult.displayTime}
            isUrgent={timerResult.isUrgent}
            onPress={() => timerSheetRef.current?.open()}
          />

          <View style={{ position: 'relative' }}>
            <PawFeedback visible={voiceState.intentFeedback?.intent === 'GO_TO_SCENE' || voiceState.intentFeedback?.intent === 'GO_TO_STEP'} size={32} />
            <Pressable
              onPress={videoControl.isVideoLoaded ? voiceState.toggleListening : undefined}
              style={[
                styles.micBtn,
                voiceState.isListening && styles.micBtnActive,
                !videoControl.isVideoLoaded && styles.micBtnDisabled,
              ]}
              hitSlop={8}
            >
              <Ionicons
                name={voiceState.isListening ? 'mic' : 'mic-off'}
                size={20}
                color={!videoControl.isVideoLoaded ? 'rgba(255,255,255,0.3)' : voiceState.isListening ? '#4ade80' : '#fff'}
              />
            </Pressable>
          </View>
        </View>

        {/* ─── 세그먼트 진행 바 ─── */}
        <View style={styles.progressBar}>
          {stepNav.steps.map((_: any, i: number) => (
            <Pressable
              key={i}
              onPress={() => stepNav.navigateStep(i)}
              style={[
                styles.progressSegment,
                i === stepNav.currentStepIndex
                  ? styles.progressActive
                  : i < stepNav.currentStepIndex
                    ? styles.progressDone
                    : styles.progressPending,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ─── YouTube 영상 + 재생 FAB ─── */}
      <View style={styles.videoContainer}>
        {!videoControl.isVideoLoaded && (
          <Animated.View style={styles.videoSkeleton}>
            <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.15)" />
          </Animated.View>
        )}
        <WebView
          ref={webviewRef}
          source={{ uri: youtubeUri }}
          style={[styles.videoWebview, !videoControl.isVideoLoaded && { opacity: 0 }]}
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
            videoControl.setIsVideoLoaded(true);
            setTimeout(() => voiceState.onWebViewReady(), 1500);
          }}
          onError={(e) => console.log('[WebView Error]', e.nativeEvent)}
          onHttpError={(e) => console.log('[WebView HTTP Error]', e.nativeEvent)}
        />
        {videoControl.isVideoLoaded && (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <PawFeedback visible={voiceState.intentFeedback?.intent === 'PLAY' || voiceState.intentFeedback?.intent === 'PAUSE'} size={28} />
            <Pressable onPress={videoControl.togglePlay} style={[styles.playFab, { position: 'relative', top: 0, right: 0 }]}>
              <Ionicons name={videoControl.isPlaying ? 'pause' : 'play'} size={16} color="#fff" />
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
            <Text style={styles.stepTitle}>{stepNav.currentStep.title}</Text>

            <View style={styles.descList}>
              <DescriptionList
                items={stepNav.currentStep.description}
                onSeek={(seconds) => {
                  webviewRef.current?.postMessage(JSON.stringify({ type: 'SEEK_TO', seconds }));
                  webviewRef.current?.postMessage(JSON.stringify({ type: 'PLAY_VIDEO' }));
                }}
              />
            </View>

          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* ─── Intent Feedback Toast ─── */}
      <IntentFeedbackToast message={voiceState.intentFeedback?.text ?? null} />

      {/* ─── 하단: 그라디언트 + 네비게이션 ─── */}
      <View style={styles.bottomGradient} pointerEvents="box-none">
        <View style={styles.gradStep1} pointerEvents="none" />
        <View style={styles.gradStep2} pointerEvents="none" />
        <View style={styles.gradStep3} pointerEvents="none" />
        <View style={styles.bottomBar}>
          <View style={{ position: 'relative', overflow: 'visible', zIndex: 100 }}>
            <PawFeedback visible={voiceState.intentFeedback?.intent === 'PREV_STEP'} size={32} />
            <Pressable
              onPress={handleManualPrev}
              disabled={stepNav.isFirstStep}
              style={[styles.navBtn, stepNav.isFirstStep && styles.navBtnHidden]}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={stepNav.isFirstStep ? 'transparent' : 'rgba(255,255,255,0.8)'} />
              <Text style={[styles.navBtnText, stepNav.isFirstStep && { color: 'transparent' }]}>이전</Text>
            </Pressable>
          </View>

          {stepNav.isLastStep ? (
            <Pressable onPress={handleBack} style={styles.completeBtn}>
              <Text style={styles.completeBtnText}>완료</Text>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ position: 'relative', overflow: 'visible', zIndex: 100 }}>
              <PawFeedback visible={voiceState.intentFeedback?.intent === 'NEXT_STEP'} size={32} />
              <Pressable onPress={handleManualNext} style={styles.navBtn} hitSlop={8}>
                <Text style={styles.navBtnText}>다음</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          )}
        </View>
        <View style={[styles.sttSafeArea, { height: Math.max(insets.bottom, 24) }]}>
          {voiceState.isListening && (
            <>
              <View style={[styles.sttDot, voiceState.pipelineState === 'TRANSCRIBING' ? styles.sttDotActive : styles.sttDotIdle]} />
              <Text
                style={[styles.sttText, voiceState.pipelineState === 'TRANSCRIBING' ? styles.sttTextActive : styles.sttTextIdle]}
                numberOfLines={1}
              >
                {voiceState.pipelineState === 'TRANSCRIBING'
                  ? voiceState.transcript || '듣고 있어요...'
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
          stepName={stepNav.currentStep?.title ?? '타이머'}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

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
