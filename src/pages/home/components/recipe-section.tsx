import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '@/src/shared/design/tokens';
import type { RecipeCard, ThemeCard } from '@/src/shared/data/mock';

interface ThemeCardsSectionProps {
  cards: ThemeCard[];
  onPress: (card: ThemeCard) => void;
}

export function ThemeCardsSection({ cards, onPress }: ThemeCardsSectionProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: colors.text.primary,
          paddingHorizontal: spacing.lg,
        }}
      >
        추천 레시피
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => onPress(card)}
            style={{
              width: 140,
              height: 100,
              backgroundColor: card.backgroundColor,
              borderRadius: radius.lg,
              padding: spacing.md,
              justifyContent: 'flex-end',
              borderCurve: 'continuous',
              overflow: 'hidden',
            }}
          >
            {card.image && (
              <Image
                source={card.image}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 56,
                  height: 56,
                }}
                contentFit="contain"
              />
            )}
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.inverse }}>
              {card.title}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
              {card.subtitle}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

interface RecipeListSectionProps {
  title: string;
  icon?: string;
  recipes: RecipeCard[];
  onPress: (recipe: RecipeCard) => void;
}

export function RecipeListSection({ title, icon, recipes, onPress }: RecipeListSectionProps) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: colors.text.primary,
          paddingHorizontal: spacing.lg,
        }}
      >
        {icon} {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
      >
        {recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() => onPress(recipe)}
            style={{ width: 160, gap: spacing.sm }}
          >
            <Image
              source={{ uri: recipe.thumbnailUrl }}
              style={{
                width: 160,
                height: 100,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
              }}
              contentFit="cover"
            />
            <View style={{ gap: 2 }}>
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                numberOfLines={1}
              >
                {recipe.title}
              </Text>
              <Text style={{ fontSize: 11, color: colors.text.secondary }}>
                {recipe.duration} · {recipe.views}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
