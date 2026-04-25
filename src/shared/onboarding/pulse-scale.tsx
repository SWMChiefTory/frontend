import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

type PulseScaleProps = {
  /** active=true 일 때만 펄스. false면 정지. */
  active: boolean;
  minScale?: number;
  /** 기본 1.12 — 튜토리얼에서 시각적 강조를 위해 크게 */
  maxScale?: number;
  /** 한 사이클 (min→max OR max→min) 의 ms. 전체 주기 = 2× */
  duration?: number;
  /** 활성 시 주변에 orange glow halo. 강조 효과 ↑ */
  withGlow?: boolean;
  children: ReactNode;
}

/**
 * children을 부드럽게 size pulse하는 wrapper.
 * 튜토리얼에서 타깃 버튼을 강조할 때 primary cue로 사용.
 *
 * 기본 maxScale=1.12로 눈에 띄게 큼. 작은 효과가 필요하면 maxScale prop 전달.
 * withGlow=true면 orange halo가 함께 펄스됨 (더 강한 강조).
 */
export function PulseScale({
  active,
  minScale = 1,
  maxScale = 1.12,
  duration = 600,
  withGlow = false,
  children,
}: PulseScaleProps) {
  const scale = useSharedValue(minScale);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(maxScale, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(minScale, { duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      if (withGlow) {
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.2, { duration, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      }
    } else {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
      scale.value = withTiming(minScale, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(glowOpacity);
    };
  }, [active, minScale, maxScale, duration, withGlow, scale, glowOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    ...(withGlow && {
      shadowColor: '#FF7300',
      shadowOpacity: glowOpacity.value,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10,
    }),
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}
