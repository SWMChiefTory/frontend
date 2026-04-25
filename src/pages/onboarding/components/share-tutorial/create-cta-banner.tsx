import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';
import { colors, radius, spacing, typography } from '@/src/shared/design/tokens';

type CreateCTABannerProps = {
  visible: boolean;
  onCreatePress: () => void;
}

/**
 * 화면 하단에서 spring으로 슬라이드 업하는 띠 형태 CTA.
 * Phase 4 — "레시피를 만들 수 있어요!" + [만들기] 버튼.
 *
 * gorhom BottomSheet 사용 안 함 — 그냥 absolute + Reanimated translateY.
 * (단순 슬라이드라 gorhom 오버킬, 시트 stacking 문제도 회피)
 */
export function CreateCTABanner({ visible, onCreatePress }: CreateCTABannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(120);
  const buttonScale = useSharedValue(1);

  // 만들기 버튼 위치 측정 → 발자국 hint
  const buttonRef = useRef<View>(null);
  const [pawTarget, setPawTarget] = useState<{ x: number; y: number } | null>(null);
  const [pawActive, setPawActive] = useState(false);

  useEffect(() => {
    if (visible) {
      // 띠 슬라이드 업 (spring으로 통통)
      translateY.value = withSpring(0, {
        damping: 14,
        stiffness: 120,
        mass: 0.7,
      });

      // 만들기 버튼 작은 펄스
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      // 띠 펼침 후 발자국 등장
      const t = setTimeout(() => {
        buttonRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
          setPawTarget({ x: pageX, y: pageY });
          setPawActive(true);
        });
      }, 700);
      return () => {
        clearTimeout(t);
      };
    } else {
      translateY.value = withTiming(120, { duration: 200 });
      cancelAnimation(buttonScale);
      buttonScale.value = withTiming(1, { duration: 200 });
      setPawActive(false);
    }
  }, [visible]);

  const bannerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: insets.bottom + spacing.md,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.xl,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            // 위쪽 모서리만 둥글게 (살짝 카드 느낌)
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            zIndex: 9000,
            // shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 12,
          },
          bannerAnimStyle,
        ]}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: typography.heading.fontFamily,
            fontSize: 16,
            fontWeight: '700',
            color: colors.text.inverse,
          }}
        >
          레시피를 만들 수 있어요!
        </Text>

        <View ref={buttonRef} collapsable={false}>
          <Animated.View style={buttonAnimStyle}>
            <Pressable
              onPress={onCreatePress}
              style={{
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.md,
                backgroundColor: '#fff',
                borderRadius: radius.full,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                만들기
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>

      {/* 만들기 버튼 위 발자국 (z-index 더 높게) */}
      {pawTarget && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9001 }} pointerEvents="none">
          <ToryPawHint
            targetX={pawTarget.x}
            targetY={pawTarget.y}
            active={pawActive}
            onComplete={() => setPawActive(false)}
            offsetX={-8}
            offsetY={-40}
          />
        </View>
      )}
    </>
  );
}
