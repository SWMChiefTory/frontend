import { useCallback } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableCardProps extends PressableProps {
  hapticIntensity?: 'light' | 'medium' | 'none';
  scaleTo?: number;
}

/**
 * 모든 카드/버튼에 일관된 press 피드백 제공:
 * - 햅틱
 * - scale 0.96 spring 애니메이션
 */
export function PressableCard({
  hapticIntensity = 'light',
  scaleTo = 0.96,
  onPress,
  style,
  children,
  ...rest
}: PressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
  }, [scaleTo]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handlePress = useCallback(
    (e: any) => {
      if (hapticIntensity !== 'none') {
        Haptics.impactAsync(
          hapticIntensity === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
      }
      onPress?.(e);
    },
    [hapticIntensity, onPress],
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style as any]}
      {...rest}
    >
      {children as any}
    </AnimatedPressable>
  );
}
