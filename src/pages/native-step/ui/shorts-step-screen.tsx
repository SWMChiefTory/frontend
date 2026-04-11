import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { IntentFeedbackToast } from '@/src/pages/native-step/components/IntentFeedbackToast';
import { PawFeedback } from '@/src/pages/native-step/components/PawFeedback';
import { HeaderTimer, TimerSheet } from '@/src/pages/native-step/components/TimerBottomSheet';
import { INJECTED_JS_BRIDGE } from './constants';
import type { StepScreenSharedProps } from './types';

const sttDot = { width: 6, height: 6, borderRadius: 3 } as const;
const sttDotActive = { backgroundColor: '#22c55e' } as const;
const sttDotIdle = { backgroundColor: '#6b7280' } as const;
const sttText = { fontSize: 12 } as const;
const sttTextActive = { color: 'rgba(255,255,255,0.8)' } as const;
const sttTextIdle = { color: 'rgba(255,255,255,0.35)' } as const;

export function ShortsStepScreen(props: StepScreenSharedProps) {
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
  const { height: screenHeight } = useWindowDimensions();
  const VIDEO_HEIGHT = screenHeight * 0.8;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
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
            videoControl.setIsVideoLoaded(true);
            setTimeout(() => voiceState.onWebViewReady(), 1500);
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
            {stepNav.currentStepIndex + 1}/{stepNav.totalSteps}
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
          {stepNav.steps.map((_: any, i: number) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === stepNav.currentStepIndex ? '#C4632B' : i < stepNav.currentStepIndex ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </View>
      </View>

      {/* 하단 텍스트 오버레이 — 배경 없음, 스크롤 가능 */}
      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 72,
          bottom: Math.max(insets.bottom, 12) + (voiceState.isListening ? 28 : 0),
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
            {stepNav.currentStep?.title}
          </Text>
          {stepNav.currentStep?.description && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {(Array.isArray(stepNav.currentStep.description)
                ? stepNav.currentStep.description
                : [stepNav.currentStep.description]
              ).map((d: any, i: number) => {
                const text = typeof d === 'string' ? d : d.content;
                const start = typeof d === 'string' ? undefined : d.start;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      if (start) {
                        const parts = start.split(':').map(Number);
                        const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                          : parts.length === 2 ? parts[0] * 60 + parts[1]
                          : parts[0] ?? 0;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        webviewRef.current?.postMessage(JSON.stringify({ type: 'SEEK_TO', seconds }));
                        webviewRef.current?.postMessage(JSON.stringify({ type: 'PLAY_VIDEO' }));
                      }
                    }}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
                  >
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
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* STT 인디케이터 — 안전영역 위 */}
      {voiceState.isListening && (
        <View style={{ position: 'absolute', left: 16, right: 72, bottom: Math.max(insets.bottom, 12), flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 16 }}>
          <View style={[sttDot, voiceState.pipelineState === 'TRANSCRIBING' ? sttDotActive : sttDotIdle]} />
          <Text style={[sttText, voiceState.pipelineState === 'TRANSCRIBING' ? sttTextActive : sttTextIdle, { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]} numberOfLines={1}>
            {voiceState.pipelineState === 'TRANSCRIBING' ? voiceState.transcript || '듣고 있어요...' : '대기 중'}
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
          <PawFeedback visible={voiceState.intentFeedback?.intent === 'PLAY' || voiceState.intentFeedback?.intent === 'PAUSE'} size={28} direction="right" />
          <Pressable
            onPress={videoControl.togglePlay}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={videoControl.isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
          </Pressable>
        </View>

        {/* 마이크 */}
        <View style={{ overflow: 'visible', position: 'relative' }}>
          <PawFeedback visible={voiceState.intentFeedback?.intent === 'GO_TO_SCENE' || voiceState.intentFeedback?.intent === 'GO_TO_STEP'} size={28} direction="right" />
          <Pressable
            onPress={videoControl.isVideoLoaded ? voiceState.toggleListening : undefined}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: voiceState.isListening ? 'rgba(74,222,128,0.3)' : '#333', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={voiceState.isListening ? 'mic' : 'mic-off'} size={18} color={voiceState.isListening ? '#4ade80' : '#fff'} />
          </Pressable>
        </View>

        {/* 이전 + 다음 붙어있게 */}
        <View style={{ gap: 2 }}>
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={voiceState.intentFeedback?.intent === 'PREV_STEP'} size={28} direction="right" />
            <Pressable
              onPress={handleManualPrev}
              disabled={stepNav.isFirstStep}
              style={{ width: 44, height: 44, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: stepNav.isFirstStep ? '#2a2a2a' : '#333', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-up" size={20} color={stepNav.isFirstStep ? '#555' : '#fff'} />
            </Pressable>
          </View>
          <View style={{ overflow: 'visible', position: 'relative' }}>
            <PawFeedback visible={voiceState.intentFeedback?.intent === 'NEXT_STEP'} size={28} direction="right" />
            {stepNav.isLastStep ? (
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

      <IntentFeedbackToast message={voiceState.intentFeedback?.text ?? null} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
        <TimerSheet ref={timerSheetRef} timerResult={timerResult} stepName={stepNav.currentStep?.title ?? '타이머'} />
      </View>
    </GestureHandlerRootView>
  );
}
