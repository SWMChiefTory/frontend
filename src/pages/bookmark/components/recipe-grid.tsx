import { View, Text, Pressable, Alert, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '@/src/shared/design/tokens';
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
        <Pressable
          key={recipe.id}
          onPress={() => onPress(recipe)}
          onLongPress={() => onLongPress(recipe)}
          delayLongPress={400}
          style={{ width: cardWidth, gap: spacing.sm }}
        >
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
          <View style={{ gap: 2 }}>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}
              numberOfLines={1}
            >
              {recipe.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary }}>
              {recipe.duration}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
