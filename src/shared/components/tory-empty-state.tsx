import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/src/shared/design/tokens';

const TORY_CHARACTERS = {
  search: require('@/assets/images/tory-search.png'),
  veggie: require('@/assets/images/tory-veggie.png'),
  write: require('@/assets/images/tory-write.png'),
  logo: require('@/assets/images/tory-logo.png'),
};

type ToryEmptyStateProps = {
  variant?: keyof typeof TORY_CHARACTERS;
  title: string;
  description?: string;
  size?: number;
  animated?: boolean;
}

/**
 * 빈 상태(검색 결과 없음, 북마크 없음 등) + 토리 캐릭터 + 살짝 떠다니는 애니메이션
 */
export function ToryEmptyState({
  variant = 'search',
  title,
  description,
  size = 140,
  animated = true,
}: ToryEmptyStateProps) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-2, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      true,
    );
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.lg }}>
      <Animated.View style={animatedStyle}>
        <Image source={TORY_CHARACTERS[variant]} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 16,
            fontWeight: '700',
            color: colors.text.primary,
          }}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}
