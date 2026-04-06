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
            width: 150,
            height: 150,
            backgroundColor: colors.background,
            borderRadius: radius.lg,
            padding: spacing.md,
            justifyContent: 'space-between',
            borderCurve: 'continuous',
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#FFDAB9',
          }}
        >
          {/* 에셋 — 오른쪽 상단 */}
          {card.image && (
            <Image
              source={card.image}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 100,
                height: 100,
              }}
              contentFit="contain"
            />
          )}

          {/* 하단 텍스트 */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
              }}
              numberOfLines={1}
            >
              {card.title}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 12,
                color: colors.text.secondary,
              }}
              numberOfLines={1}
            >
              {card.subtitle}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
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
