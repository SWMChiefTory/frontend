import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PulseScale } from '@/src/shared/onboarding/pulse-scale';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';
import { TargetCaption } from '@/src/shared/onboarding/target-caption';

const APP_SHARE_1 = require('@/assets/images/onboarding/app-share_1.png');

// YouTube 모바일 라이트 모드 색상
const YT_BODY_BG = '#FFFFFF';
const YT_CHIP_BG = '#F2F2F2';
const YT_CARD_BG = '#F2F2F2';
const YT_TEXT = '#0F0F0F';
const YT_TEXT_DIM = '#606060';
const INACTIVE_OPACITY = 0.4;
const CONTEXT_OPACITY = 0.7;

type MockYouTubeScreenProps = {
  isInteractive: boolean;
  onSharePress: () => void;
}

/**
 * 유튜브 영상 화면 mock — 라이트 모드.
 *
 * 레이아웃 (단순 flex column, 위에서 아래로 자연 스택):
 *   1) Top safe area + TutorialHeader 영역 (검은색)
 *   2) 영상 플레이어 (검은색, 16:9)
 *   3) 본문 시작 (흰색, flex: 1로 남은 영역 채움)
 *      a) 제목 + 메타 정보
 *      b) 액션 chip row (가로 스크롤)
 *      c) 활성 시 캡션 (액션 row 바로 아래, share 버튼 가리킴)
 *      d) 댓글 placeholder
 *      e) 남은 흰 공간
 *
 * 핵심 변경: 외부 ScrollView 제거 + minHeight 제거 → 자연스러운 column flow.
 * 액션 row의 horizontal ScrollView는 flexGrow:0 으로 vertical stretch 방지.
 */
export function MockYouTubeScreen({ isInteractive, onSharePress }: MockYouTubeScreenProps) {
  const insets = useSafeAreaInsets();
  const shareButtonRef = useRef<View>(null);
  const [targetBounds, setTargetBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pawActive, setPawActive] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!isInteractive) {
      // 즉시 정리 (lingering 방지)
      setPawActive(false);
      setTargetBounds(null);
      return;
    }
    const t = setTimeout(() => {
      shareButtonRef.current?.measure?.((_x, _y, w, h, pageX, pageY) => {
        setTargetBounds({ x: pageX, y: pageY, width: w, height: h });
        setPawActive(true);
      });
    }, 100);
    return () => clearTimeout(t);
  }, [isInteractive]);

  const handleWrongTap = () => {
    if (!isInteractive) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShake((n) => n + 1);
  };

  // 공유 버튼 탭 시 — 캡션/발자국 즉시 cleanup 후 부모로 propagate
  const handleSharePressInternal = useCallback(() => {
    setPawActive(false);
    setTargetBounds(null);
    onSharePress();
  }, [onSharePress]);

  return (
    <Pressable onPress={handleWrongTap} style={{ flex: 1, backgroundColor: '#000' }}>
      {/* 1) Top safe area + TutorialHeader 영역 (검은색) */}
      <View style={{ height: insets.top + 50 }} />

      {/* 2) 영상 플레이어 (검은색, 16:9) */}
      <View
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          backgroundColor: '#000',
          opacity: isInteractive ? CONTEXT_OPACITY : 1,
        }}
      >
        <Image source={APP_SHARE_1} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
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

      {/* 3) 본문 (흰색, 영상 아래 — 남은 공간 채움) */}
      <View style={{ flex: 1, backgroundColor: YT_BODY_BG }}>
        {/* 3a) 제목 + 메타 */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            opacity: isInteractive ? CONTEXT_OPACITY : 1,
          }}
        >
          <Text
            style={{ color: YT_TEXT, fontSize: 16, fontWeight: '700', lineHeight: 22 }}
            numberOfLines={2}
          >
            🔥 요즘 sns에서 핫한 상하이 버터떡 만들기 + 쫀…
          </Text>
          <Text style={{ color: YT_TEXT_DIM, fontSize: 12, marginTop: 6 }}>
            @jinyeong6425  ·  조회수 28만회  ·  1개월 전
          </Text>
        </View>

        {/* 3b) 액션 chip row — 제목 바로 아래, 가로 스크롤
                활성 시 공유 버튼이 1.12x로 펄스 + glow shadow 16px → 위/아래로 자라남.
                paddingVertical 12 + overflow:visible로 부모 클리핑 방지. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, paddingTop: 6, overflow: 'visible' }}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            overflow: 'visible',
          }}
        >
          {/* 채널 아바타 */}
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#F8C8C8',
              opacity: isInteractive ? INACTIVE_OPACITY : 1,
            }}
          />

          {/* 구독 — 검은 버튼 */}
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              backgroundColor: YT_TEXT,
              borderRadius: 16,
              opacity: isInteractive ? INACTIVE_OPACITY : 1,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>구독</Text>
          </View>

          {/* 좋아요/싫어요 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 7,
              backgroundColor: YT_CHIP_BG,
              borderRadius: 16,
              opacity: isInteractive ? INACTIVE_OPACITY : 1,
            }}
          >
            <Ionicons name="thumbs-up-outline" size={15} color={YT_TEXT} />
            <Text style={{ color: YT_TEXT, fontSize: 13 }}>4천</Text>
            <View
              style={{
                width: 1,
                height: 12,
                backgroundColor: 'rgba(0,0,0,0.15)',
                marginHorizontal: 4,
              }}
            />
            <Ionicons name="thumbs-down-outline" size={15} color={YT_TEXT} />
          </View>

          {/* 공유 — icon only, 활성 타깃
              outer wrapper 없이 PulseScale을 단독 위치에 두어 부모 영향 격리.
              펄스/glow가 자라더라도 paddingVertical 12 안에서 자유롭게 확장됨. */}
          <View ref={shareButtonRef} collapsable={false} style={{ overflow: 'visible' }}>
            <PulseScale active={isInteractive} withGlow>
              <Pressable
                onPress={isInteractive ? handleSharePressInternal : undefined}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  backgroundColor: isInteractive ? '#FFE4D0' : YT_CHIP_BG,
                  borderRadius: 16,
                  borderWidth: isInteractive ? 2.5 : 0,
                  borderColor: '#FF7300',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="arrow-redo-outline"
                  size={17}
                  color={isInteractive ? '#FF7300' : YT_TEXT}
                />
              </Pressable>
            </PulseScale>
          </View>

          {/* 저장 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 11,
              paddingVertical: 7,
              backgroundColor: YT_CHIP_BG,
              borderRadius: 16,
              opacity: isInteractive ? INACTIVE_OPACITY : 1,
            }}
          >
            <Ionicons name="bookmark-outline" size={15} color={YT_TEXT} />
            <Text style={{ color: YT_TEXT, fontSize: 13 }}>저장</Text>
          </View>

          {/* 리믹스 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 11,
              paddingVertical: 7,
              backgroundColor: YT_CHIP_BG,
              borderRadius: 16,
              opacity: isInteractive ? INACTIVE_OPACITY : 1,
            }}
          >
            <Ionicons name="shuffle-outline" size={15} color={YT_TEXT} />
            <Text style={{ color: YT_TEXT, fontSize: 13 }}>리믹스</Text>
          </View>
        </ScrollView>

        {/* 3c) 댓글 placeholder — 액션 row 바로 아래 (캡션은 absolute overlay) */}
        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
            padding: 14,
            backgroundColor: YT_CARD_BG,
            borderRadius: 12,
            gap: 10,
            opacity: isInteractive ? INACTIVE_OPACITY : 1,
          }}
        >
          <View
            style={{
              width: 64,
              height: 10,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.15)',
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.12)',
              }}
            />
            <View style={{ flex: 1, gap: 6, paddingTop: 4 }}>
              <View
                style={{
                  width: '70%',
                  height: 8,
                  borderRadius: 3,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                }}
              />
              <View
                style={{
                  width: '90%',
                  height: 8,
                  borderRadius: 3,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* === Overlays (absolute, zIndex로 다른 layout 영향 X) === */}

      {/* 토리 발자국 */}
      {targetBounds && (
        <ToryPawHint
          targetX={targetBounds.x}
          targetY={targetBounds.y}
          active={pawActive}
          shake={shake > 0}
          onComplete={() => setPawActive(false)}
        />
      )}

      {/* 캡션 — 공유 버튼 바로 아래에 absolute로 떠 있음 */}
      {isInteractive && (
        <TargetCaption
          target={targetBounds}
          prefix="요리하고 싶은 영상을 선택 후"
          primary="공유 버튼을 눌러주세요!"
          step={1}
          total={4}
        />
      )}
    </Pressable>
  );
}
