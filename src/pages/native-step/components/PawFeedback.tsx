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

interface PawFeedbackProps {
  visible: boolean;
  onDone?: () => void;
  size?: number;
}

/**
 * 음성 명령 수행 시 버튼 바로 위에서 발자국이 나타났다 아래로 사라지는 피드백.
 */
export function PawFeedback({ visible, onDone, size = 48 }: PawFeedbackProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (!visible) return;

    // 위에서 나타남
    translateY.value = -20;
    opacity.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      withDelay(500, withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })),
    );

    translateY.value = withSequence(
      withTiming(-size - 4, { duration: 150, easing: Easing.out(Easing.ease) }),
      withDelay(500, withTiming(-size + 10, { duration: 300, easing: Easing.in(Easing.ease) })),
    );

    scale.value = withSequence(
      withTiming(1.1, { duration: 150, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0.5, { duration: 300, easing: Easing.in(Easing.ease) })),
    );

    if (onDone) {
      const timer = setTimeout(() => onDone(), 950);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
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
          left: '50%',
          marginLeft: -size / 2,
          width: size,
          height: size,
          zIndex: 999,
          elevation: 999,
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Image
        source={PAW_IMAGE}
        style={{ width: size, height: size }}
        contentFit="contain"
        tintColor="#FF7300"
      />
    </Animated.View>
  );
}
