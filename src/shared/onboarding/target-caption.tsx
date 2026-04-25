import { useEffect, useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '@/src/shared/design/tokens';

type TargetCaptionProps = {
  /** 메인 액션 텍스트 (bold + 큰 글씨) */
  primary: string;
  /** primary 앞 보조 설명 (작은 글씨) */
  prefix?: string;
  /** primary 뒤 보조 설명 (작은 글씨) */
  suffix?: string;
  /** 타깃의 page 좌표 + 크기 (View.measure 결과). null이면 렌더 X */
  target: { x: number; y: number; width: number; height: number } | null;
  /** 타깃 바닥에서 캡션 top까지 거리 (default 14) */
  offsetY?: number;
  /** 위쪽 화살표 표시 여부 */
  arrowUp?: boolean;
  /** 살짝 통통 튀는 강조 */
  bouncy?: boolean;
  /** 화면 좌우 가장자리 최소 여백 */
  screenPadding?: number;
  /** 진행 단계 (1-based). total과 함께 제공 시 "1/4" 형태로 우상단에 표시 */
  step?: number;
  /** 전체 단계 수 */
  total?: number;
}

/**
 * 타깃 바로 아래에 absolute positioning으로 띄우는 설명 캡션.
 *
 * 레이아웃 격리:
 *   - position: 'absolute' + zIndex 9999 → 다른 요소 layout에 영향 0
 *   - 부모는 그대로 렌더, 캡션만 overlay됨
 *   - pointerEvents: 'none' → 캡션이 탭 흡수 안 함
 *
 * 위치 계산:
 *   - top  = target.y + target.height + offsetY  (타깃 바로 아래)
 *   - left = target.x + target.width/2 - captionWidth/2  (타깃 중앙 기준 horizontal centering)
 *   - 화면 좌우 가장자리는 screenPadding으로 clamp (캡션이 화면 밖 안 나감)
 *
 * 캡션 width는 onLayout으로 측정. 측정 전엔 opacity 0 (살짝의 첫 frame flicker 방지).
 */
export function TargetCaption({
  primary,
  prefix,
  suffix,
  target,
  offsetY = 14,
  arrowUp = true,
  bouncy = true,
  screenPadding = 16,
  step,
  total,
}: TargetCaptionProps) {
  const hasProgress = step !== undefined && total !== undefined;
  const screenWidth = Dimensions.get('window').width;
  const [captionWidth, setCaptionWidth] = useState(0);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!target) {
      // target null로 전환 시 즉시 invisible (lingering 방지)
      opacity.value = 0;
      scale.value = 0.85;
      return;
    }
    // 빠른 등장 (사용자 체감 즉시성 향상)
    opacity.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.4)) });

    if (bouncy) {
      translateY.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    }
  }, [target, bouncy]);

  const animStyle = useAnimatedStyle(() => ({
    // 측정 전엔 invisible (좌측 0에 일시 배치되는 flicker 방지)
    opacity: captionWidth > 0 ? opacity.value : 0,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  if (!target) return null;

  // 수평 위치 계산: 타깃 중앙 기준 + 화면 가장자리 clamp
  const targetCenter = target.x + target.width / 2;
  let left = targetCenter - captionWidth / 2;
  if (captionWidth > 0) {
    left = Math.max(screenPadding, left);
    left = Math.min(screenWidth - captionWidth - screenPadding, left);
  } else {
    // 측정 전엔 임시로 화면 중앙 (flicker 방지차 어차피 invisible)
    left = screenPadding;
  }

  const top = target.y + target.height + offsetY;

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(e) => setCaptionWidth(e.nativeEvent.layout.width)}
      style={[
        {
          position: 'absolute',
          top,
          left,
          zIndex: 9999,
          // 캡션 자체에 max-width 줘서 너무 길지 않게
          maxWidth: screenWidth - screenPadding * 2,
        },
        animStyle,
      ]}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: colors.primary,
          borderRadius: 14,
          shadowColor: '#FF7300',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
          gap: 3,
        }}
      >
        {/* prefix + progress 배지 (top row) */}
        {(prefix || hasProgress) ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontFamily: typography.body.fontFamily,
                color: 'rgba(255,255,255,0.85)',
                fontSize: 11,
                fontWeight: '500',
                lineHeight: 15,
              }}
            >
              {prefix ?? ''}
            </Text>
            {hasProgress ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {step}/{total}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* primary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {arrowUp && <Ionicons name="chevron-up" size={15} color="#fff" />}
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: '#fff',
              fontSize: 15,
              fontWeight: '800',
              flexShrink: 1,
            }}
          >
            {primary}
          </Text>
        </View>

        {/* suffix */}
        {suffix ? (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 11,
              fontWeight: '500',
              lineHeight: 15,
            }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}
