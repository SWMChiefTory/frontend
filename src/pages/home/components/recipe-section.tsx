import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
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
          fontFamily: typography.heading.fontFamily,
          ...typography.heading.h2,
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
              width: 200,
              height: 150,
              backgroundColor: card.backgroundColor,
              borderRadius: radius.xl,
              padding: spacing.lg,
              justifyContent: 'flex-end',
              borderCurve: 'continuous',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            {card.image && (
              <Image
                source={card.image}
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bottom: -8,
                  width: '70%',
                }}
                contentFit="contain"
              />
            )}
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 17, fontWeight: '700', color: colors.text.inverse }}>
              {card.title}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
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
          fontFamily: typography.heading.fontFamily,
          ...typography.heading.h2,
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
                style={{ fontFamily: typography.body.fontFamily, fontSize: 13, fontWeight: '600', color: colors.text.primary }}
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
