import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PulseScale } from '@/src/shared/onboarding/pulse-scale';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';

const APP_SHARE_1 = require('@/assets/images/onboarding/app-share_1.png');

type MockYouTubeScreenProps = {
  isInteractive: boolean;
  onSharePress: () => void;
}

/**
 * 유튜브 영상 화면 mock. 공유 버튼만 탭 가능.
 *
 * 첫 phase MVP — 실제 유튜브 UI를 흉내 내되 ChefTory 디자인 톤에 맞춤.
 * 공유 버튼 위치를 measure해서 ToryPawHint에 전달.
 */
export function MockYouTubeScreen({ isInteractive, onSharePress }: MockYouTubeScreenProps) {
  const insets = useSafeAreaInsets();
  const shareButtonRef = useRef<View>(null);
  const [pawTarget, setPawTarget] = useState<{ x: number; y: number } | null>(null);
  const [pawActive, setPawActive] = useState(false);
  const [shake, setShake] = useState(0);

  // Phase 진입 시 공유 버튼 위치 측정 → 발자국 활성화
  useEffect(() => {
    if (!isInteractive) {
      setPawActive(false);
      return;
    }
    // measure는 mount + layout 완료 후에 가능 → 약간 delay
    const t = setTimeout(() => {
      shareButtonRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
        setPawTarget({ x: pageX, y: pageY });
        setPawActive(true);
      });
    }, 600);
    return () => clearTimeout(t);
  }, [isInteractive]);

  // 비활성 영역 탭 시: 햅틱 + 발자국 wiggle (forgiving feedback)
  const handleWrongTap = () => {
    if (!isInteractive) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShake((n) => n + 1);
  };

  return (
    <Pressable
      onPress={handleWrongTap}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <View style={{ paddingTop: insets.top + 50 /* TutorialHeader 영역 */ }}>
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
          {/* 영상 영역 */}
          <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111' }}>
            <Image
              source={APP_SHARE_1}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            {/* 영상 컨트롤 오버레이 (장식, 비활성) */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 60,
                backgroundColor: 'rgba(0,0,0,0.15)',
              }}
              pointerEvents="none"
            >
              <Ionicons name="play-skip-back" size={28} color="rgba(255,255,255,0.65)" />
              <Ionicons name="play" size={44} color="rgba(255,255,255,0.75)" />
              <Ionicons name="play-skip-forward" size={28} color="rgba(255,255,255,0.65)" />
            </View>
            {/* 진행바 */}
            <View
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11 }}>0:11 / 6:00</Text>
            </View>
          </View>

          {/* 영상 제목 */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
            <Text
              style={{ color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 }}
              numberOfLines={2}
            >
              🔥 요즘 sns에서 핫한 상하이 버터떡 만들기 + 쫀…
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>
              @jinyeong6425  ·  조회수 28만회  ·  1개월 전
            </Text>
          </View>

          {/* 액션 row: 구독 / 좋아요 / 싫어요 / 공유(타깃) / 저장 */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingTop: 12,
              gap: 8,
              alignItems: 'center',
            }}
          >
            {/* 채널 아바타 + 구독 (장식) */}
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#888',
              }}
            />
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#fff',
                borderRadius: 16,
              }}
            >
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>구독</Text>
            </View>

            {/* 좋아요/싫어요 (장식) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: '#272727',
                borderRadius: 16,
              }}
            >
              <Ionicons name="thumbs-up-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12 }}>4천</Text>
              <View
                style={{
                  width: 1,
                  height: 12,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  marginHorizontal: 4,
                }}
              />
              <Ionicons name="thumbs-down-outline" size={14} color="#fff" />
            </View>

            {/* 공유 — 타깃 (활성) */}
            <View ref={shareButtonRef} collapsable={false}>
              <PulseScale active={isInteractive}>
                <Pressable
                  onPress={isInteractive ? onSharePress : undefined}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: isInteractive ? '#3a3a3a' : '#272727',
                    borderRadius: 16,
                    borderWidth: isInteractive ? 1.5 : 0,
                    borderColor: '#FF7300',
                  }}
                >
                  <Ionicons name="arrow-redo-outline" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>공유</Text>
                </Pressable>
              </PulseScale>
            </View>
          </View>

          {/* 댓글 영역 — 구조만 보여주는 빈 placeholder. 텍스트 없음 (시선 분산 방지). */}
          <View
            style={{
              marginTop: 16,
              marginHorizontal: 16,
              padding: 14,
              backgroundColor: '#1a1a1a',
              borderRadius: 12,
              gap: 10,
            }}
          >
            {/* "댓글 N" 헤더 자리 */}
            <View
              style={{
                width: 64,
                height: 10,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            />
            {/* 댓글 1행: 아바타 + 2줄 텍스트 placeholder */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View style={{ flex: 1, gap: 6, paddingTop: 4 }}>
                <View
                  style={{
                    width: '70%',
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                />
                <View
                  style={{
                    width: '90%',
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 토리 발자국 hint (공유 버튼 옆) */}
      {pawTarget && (
        <ToryPawHint
          targetX={pawTarget.x}
          targetY={pawTarget.y}
          active={pawActive}
          shake={shake > 0}
          onComplete={() => setPawActive(false)}
        />
      )}
    </Pressable>
  );
}
