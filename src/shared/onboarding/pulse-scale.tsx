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
  maxScale?: number;
  /** 한 사이클 (min→max OR max→min) 의 ms. 전체 주기 = 2× */
  duration?: number;
  children: ReactNode;
}

/**
 * children을 부드럽게 size pulse하는 wrapper.
 * 튜토리얼에서 타깃 버튼을 강조할 때 primary cue로 사용.
 *
 * 예: <PulseScale active={isInteractive}><ShareButton /></PulseScale>
 */
export function PulseScale({
  active,
  minScale = 1,
  maxScale = 1.06,
  duration = 700,
  children,
}: PulseScaleProps) {
  const scale = useSharedValue(minScale);

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
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(minScale, { duration: 200 });
    }
    return () => cancelAnimation(scale);
  }, [active, minScale, maxScale, duration, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}
