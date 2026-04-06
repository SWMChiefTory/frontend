import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
      ))}
    </View>
  );
}
