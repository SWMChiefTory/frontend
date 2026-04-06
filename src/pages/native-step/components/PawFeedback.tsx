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
 * 버튼 위에 오버레이로 발자국이 나타났다 사라지는 피드백.
 * 부모 View와 동일한 위치에 겹쳐서 표시됨.
 */
export function PawFeedback({ visible, onDone, size = 36 }: PawFeedbackProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (!visible) return;

    opacity.value = withSequence(
      withTiming(0.9, { duration: 150, easing: Easing.out(Easing.ease) }),
      withDelay(500, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })),
    );

    scale.value = withSequence(
      withTiming(1.15, { duration: 150, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0.7, { duration: 400, easing: Easing.in(Easing.ease) })),
    );

    if (onDone) {
      const timer = setTimeout(() => onDone(), 1050);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
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
        tintColor="#FF7300"
      />
    </Animated.View>
  );
}
