import { useEffect } from 'react';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

const PAW_PRINT = require('@/assets/images/paw-print.png');

type ToryPawHintProps = {
  /** 타깃 버튼의 page 좌표 (View.measure 결과 pageX/pageY) */
  targetX: number;
  targetY: number;
  active: boolean;
  /** fade-out 완료 시 호출 (자동 정리용) */
  onComplete?: () => void;
  size?: number;
  /** 타깃 기준 발자국 위치 offset */
  offsetX?: number;
  offsetY?: number;
  /** wrong-tap 시 짧은 wiggle 효과로 재호출 */
  shake?: boolean;
}

/**
 * 토리 발자국이 타깃 옆에서 등장 → bounce → fade-out.
 *
 * 첫 phase 진입 시 brand spike(첫 1.5초만 visible). 그 이후엔 PulseScale이 sustained cue로 동작.
 * wrong-tap 시 shake prop으로 재 등장 + 좌우 wiggle.
 *
 * 임시: Ionicons paw 아이콘 사용. 추후 토리 발자국 PNG로 교체 가능 (Image source).
 */
export function ToryPawHint({
  targetX,
  targetY,
  active,
  onComplete,
  size = 32,
  offsetX = 12,
  offsetY = -36,
  shake = false,
}: ToryPawHintProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(-15);

  // 정상 등장 시퀀스 (active true일 때 1회)
  useEffect(() => {
    if (!active) {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(rotate);
      opacity.value = 0;
      translateY.value = 20;
      rotate.value = -15;
      return;
    }

    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 250 });

    // 등장 후 bounce 3회
    translateY.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 220 }),
          withTiming(0, { duration: 220 }),
        ),
        3,
        false,
      ),
    );

    // 살짝 좌우 흔들흔들 회전
    rotate.value = withSequence(
      withTiming(15, { duration: 280 }),
      withTiming(-15, { duration: 280 }),
      withTiming(0, { duration: 280 }),
    );

    // 1.5초 후 fade-out
    opacity.value = withDelay(
      1500,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      }),
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(rotate);
    };
  }, [active]);

  // wrong-tap 시 짧은 wiggle 재호출
  useEffect(() => {
    if (!shake) return;

    opacity.value = withTiming(1, { duration: 120 });
    translateY.value = 0;
    rotate.value = 0;
    translateX.value = withSequence(
      withTiming(-6, { duration: 80 }),
      withTiming(6, { duration: 80 }),
      withTiming(-4, { duration: 80 }),
      withTiming(4, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    );
    opacity.value = withDelay(700, withTiming(0, { duration: 200 }));
  }, [shake]);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: targetX + offsetX,
    top: targetY + offsetY,
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <Image source={PAW_PRINT} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
