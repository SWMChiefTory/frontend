import { useEffect } from 'react';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const PAW_IMAGE = require('@/assets/images/paw-print.png');

interface PawFeedbackProps {
  visible: boolean;
  onDone?: () => void;
  size?: number;
}

/**
 * 음성 명령 수행 시 발자국이 올라왔다 사라지는 피드백 애니메이션.
 * - 아래에서 위로 올라오면서 나타남
 * - 잠시 유지 후 위로 올라가며 사라짐
 */
export function PawFeedback({ visible, onDone, size = 48 }: PawFeedbackProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (!visible) return;

    // 올라오면서 나타남
    opacity.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      withDelay(600, withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })),
    );

    translateY.value = withSequence(
      withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) }),
      withDelay(600, withTiming(-30, { duration: 400, easing: Easing.in(Easing.ease) })),
    );

    scale.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) }),
      withDelay(600, withTiming(0.6, {
        duration: 400,
        easing: Easing.in(Easing.ease),
      })),
    );

    // 애니메이션 끝나면 콜백
    if (onDone) {
      const timer = setTimeout(() => onDone(), 1200);
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
          top: -size - 8,
          alignSelf: 'center',
          width: size,
          height: size,
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
