/**
 * IntentFeedbackToast – 명령 실행 피드백
 *
 * "다음 단계 →", "⏸ 일시정지" 등 화면 중앙에 잠시 표시.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

type IntentFeedbackToastProps = {
  message: string | null;
}

export function IntentFeedbackToast({ message }: IntentFeedbackToastProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    if (message) {
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 300 }),
      );
      scale.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: 1200 }),
        withTiming(0.85, { duration: 300 }),
      );
    }
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.Text style={styles.text}>{message}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 999,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
