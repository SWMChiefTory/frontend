import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import type { RecipeCard } from '@/src/shared/data/mock';

interface RecipeGridProps {
  recipes: RecipeCard[];
  onPress: (recipe: RecipeCard) => void;
  onLongPress: (recipe: RecipeCard) => void;
}

export function RecipeGrid({ recipes, onPress, onLongPress }: RecipeGridProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.lg * 2 - spacing.md) / 2;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
      }}
    >
      {recipes.map((recipe) => (
        <RecipeCardItem
          key={recipe.id}
          recipe={recipe}
          cardWidth={cardWidth}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      ))}
    </View>
  );
}

const LONG_PRESS_DURATION = 500;

function RecipeCardItem({
  recipe,
  cardWidth,
  onPress,
  onLongPress,
}: {
  recipe: RecipeCard;
  cardWidth: number;
  onPress: (recipe: RecipeCard) => void;
  onLongPress: (recipe: RecipeCard) => void;
}) {
  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.94, { duration: LONG_PRESS_DURATION, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withTiming(0.25, { duration: LONG_PRESS_DURATION });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    overlayOpacity.value = withTiming(0, { duration: 150 });
  }, []);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress(recipe);
  }, [recipe, onLongPress]);

  return (
    <Animated.View style={[{ width: cardWidth, gap: spacing.sm }, animatedStyle]}>
      <Pressable
        onPress={() => onPress(recipe)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={LONG_PRESS_DURATION}
        style={{ gap: spacing.sm }}
      >
        <View>
          <Image
            source={{ uri: recipe.thumbnailUrl }}
            style={{
              width: cardWidth,
              height: cardWidth * 0.65,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
            }}
            contentFit="cover"
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000',
                borderRadius: radius.md,
              },
              overlayStyle,
            ]}
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text
            style={{ fontFamily: typography.body.fontFamily, fontSize: 14, fontWeight: '600', color: colors.text.primary }}
            numberOfLines={2}
          >
            {recipe.title}
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
            {recipe.duration} {recipe.views ? `· ${recipe.views}` : ''}
          </Text>
          <Pressable
            onPress={() => router.push(`/native-step/${recipe.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: colors.primary,
              paddingVertical: 6,
              borderRadius: radius.sm,
              marginTop: 2,
            }}
          >
            <Ionicons name="mic" size={12} color="#fff" />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, fontWeight: '600', color: '#fff' }}>
              음성 모드
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
