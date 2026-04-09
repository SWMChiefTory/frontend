import { useEffect } from 'react';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const PAW_IMAGE = require('@/assets/images/paw-print.png');

type PawFeedbackProps = {
  visible: boolean;
  onDone?: () => void;
  size?: number;
  direction?: 'down' | 'right';
}

export function PawFeedback({ visible, onDone, size = 36, direction = 'down' }: PawFeedbackProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (!visible) return;

    // 나타남: 바운스 스케일
    opacity.value = withSequence(
      withTiming(0.9, { duration: 150, easing: Easing.out(Easing.ease) }),
      withDelay(500, withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })),
    );

    scale.value = withSequence(
      withTiming(1.15, { duration: 150, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(1, { duration: 300 })),
    );

    // 사라짐: 방향에 따라 이동
    if (direction === 'right') {
      translateX.value = withSequence(
        withTiming(0, { duration: 150 }),
        withDelay(500, withTiming(30, { duration: 300, easing: Easing.in(Easing.ease) })),
      );
    } else {
      translateY.value = withSequence(
        withTiming(0, { duration: 150 }),
        withDelay(500, withTiming(30, { duration: 300, easing: Easing.in(Easing.ease) })),
      );
    }

    if (onDone) {
      const timer = setTimeout(() => onDone(), 950);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Image
        source={PAW_IMAGE}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor="#C4632B"
      />
    </Animated.View>
  );
}
