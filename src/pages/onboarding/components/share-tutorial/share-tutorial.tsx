import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TutorialHeader } from '@/src/shared/onboarding/tutorial-header';
import { track, TutorialShareEvents } from '@/src/shared/analytics';
import { MockYouTubeScreen } from './mock-youtube-screen';
import { MockYouTubeShareSheet, type MockYouTubeShareSheetRef } from './mock-youtube-share-sheet';
import { MockIOSShareSheet, type MockIOSShareSheetRef } from './mock-ios-share-sheet';
import { MockAndroidShareSheet, type MockAndroidShareSheetRef } from './mock-android-share-sheet';
import { CreateCTABanner } from './create-cta-banner';

export type SharePhase = 'youtube' | 'youtube_share' | 'ios_share' | 'cta';

type ShareTutorialProps = {
  onComplete: () => void;
  onSkip: () => void;
}

// 두 플랫폼 시트가 같은 API → 단일 ref 타입으로 통일
type ShareSheetRef = MockIOSShareSheetRef | MockAndroidShareSheetRef;

/**
 * 공유하기 인터랙티브 튜토리얼 (4 phase).
 *
 * Layer 구조:
 *   1) MockYouTubeScreen — 항상 visible (배경)
 *   2) MockYouTubeShareSheet — Phase 2 BottomSheet
 *   3) MockIOSShareSheet OR MockAndroidShareSheet — Phase 3 (Platform.OS 분기)
 *   4) CreateCTABanner — Phase 4 슬라이드 업 띠
 *
 * Sequential transition (Phase 2 → 3): 유튜브 시트가 먼저 close → onClosedAfterMore
 * 콜백에서 iOS/Android 시트 open. 시각적으로 자연스러운 sheet swap.
 */
export function ShareTutorial({ onComplete, onSkip }: ShareTutorialProps) {
  const [phase, setPhase] = useState<SharePhase>('youtube');
  const [startedAt] = useState(() => Date.now());

  const youtubeShareSheetRef = useRef<MockYouTubeShareSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);

  // VIEW 이벤트 (mount 시 1회)
  useEffect(() => {
    track(TutorialShareEvents.VIEW);
  }, []);

  // ─── Phase 1 → Phase 2 ───
  const handleSharePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    track(TutorialShareEvents.YOUTUBE_TAP);
    setPhase('youtube_share');
    youtubeShareSheetRef.current?.open();
  }, []);

  // ─── Phase 2 → Phase 3 (sequential transition) ───
  const handleMorePress = useCallback(() => {
    track(TutorialShareEvents.MORE_TAP);
    // 시트 close는 MockYouTubeShareSheet 내부에서 자동 호출.
    // close 완료 후 onClosedAfterMore 콜백으로 다음 phase 진입.
  }, []);

  const handleYouTubeShareClosed = useCallback(() => {
    setPhase('ios_share');
    // 약간 delay 후 다음 시트 열기 (시각적 여유)
    setTimeout(() => {
      shareSheetRef.current?.open();
    }, 100);
  }, []);

  // ─── Phase 3 → Phase 4 ───
  const handleCheftoryPress = useCallback(() => {
    track(TutorialShareEvents.CHEFTORY_TAP);
    setPhase('cta');
    // 시트는 그대로 열려 있음 (CTA 띠가 그 위에 나타남) → 시각적 stack
  }, []);

  // ─── Phase 4 → 완료 ───
  const handleCreatePress = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    track(TutorialShareEvents.CREATE_TAP);
    track(TutorialShareEvents.COMPLETE, { duration_ms: Date.now() - startedAt });
    onComplete();
  }, [onComplete, startedAt]);

  // ─── Skip (어느 phase에서든) ───
  const handleSkip = useCallback(() => {
    track(TutorialShareEvents.SKIP, { phase, duration_ms: Date.now() - startedAt });
    onSkip();
  }, [onSkip, phase, startedAt]);

  // ─── Wrong tap (forgiving feedback + 분석용) ───
  const handleWrongTap = useCallback(() => {
    track(TutorialShareEvents.WRONG_TAP, { phase });
  }, [phase]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Layer 1: YouTube 영상 화면 (배경) */}
      <MockYouTubeScreen
        isInteractive={phase === 'youtube'}
        onSharePress={handleSharePress}
      />

      {/* Layer 2: YouTube 공유 시트 (Phase 2) */}
      <MockYouTubeShareSheet
        ref={youtubeShareSheetRef}
        isInteractive={phase === 'youtube_share'}
        onMorePress={handleMorePress}
        onWrongTap={handleWrongTap}
        onClosedAfterMore={handleYouTubeShareClosed}
      />

      {/* Layer 3: iOS / Android 공유 시트 (Phase 3) — Platform.OS 분기 */}
      {Platform.OS === 'ios' ? (
        <MockIOSShareSheet
          ref={shareSheetRef as React.RefObject<MockIOSShareSheetRef>}
          isInteractive={phase === 'ios_share'}
          onCheftoryPress={handleCheftoryPress}
          onWrongTap={handleWrongTap}
        />
      ) : (
        <MockAndroidShareSheet
          ref={shareSheetRef as React.RefObject<MockAndroidShareSheetRef>}
          isInteractive={phase === 'ios_share'}
          onCheftoryPress={handleCheftoryPress}
          onWrongTap={handleWrongTap}
        />
      )}

      {/* Layer 4: 만들기 CTA 띠 (Phase 4) */}
      <CreateCTABanner
        visible={phase === 'cta'}
        onCreatePress={handleCreatePress}
      />

      {/* 헤더: 건너뛰기 only (진행은 각 캡션의 1/4 배지가 담당) */}
      <TutorialHeader onSkip={handleSkip} />
    </View>
  );
}
