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
    <View
      style={{
        paddingVertical: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          fontFamily: typography.heading.fontFamily,
          ...typography.heading.h2,
          color: colors.text.primary,
          paddingHorizontal: spacing.lg,
        }}
      >
        이런 요리 어때요?
      </Text>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: 13,
          color: colors.text.secondary,
          paddingHorizontal: spacing.lg,
          marginTop: -spacing.sm,
        }}
      >
        토리가 직접 엄선했어요!
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
            width: 120,
            height: 110,
            backgroundColor: colors.background,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.sm,
            paddingBottom: spacing.sm,
            paddingTop: spacing.sm,
            alignItems: 'center',
            borderCurve: 'continuous',
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#C4A882',
          }}
        >
          {/* 에셋 — 중앙 */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {card.image && (
              <Image
                source={card.image}
                style={{ width: 72, height: 72 }}
                contentFit="contain"
              />
            )}
          </View>

          {/* 하단 텍스트 */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 13,
                fontWeight: '700',
                color: colors.text.primary,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {card.title}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 10,
                color: colors.text.secondary,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {card.subtitle}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
    </View>
  );
}

interface RecentRecipeSectionProps {
  recipes: RecipeCard[];
  onPress: (recipe: RecipeCard) => void;
}

export function RecentRecipeSection({ recipes, onPress }: RecentRecipeSectionProps) {
  return (
    <View
      style={{
        paddingVertical: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          fontFamily: typography.heading.fontFamily,
          ...typography.heading.h2,
          color: colors.text.primary,
          paddingHorizontal: spacing.lg,
        }}
      >
        최근 시청 레시피
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
            style={{
              width: 220,
              flexDirection: 'row',
              gap: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.sm,
              borderCurve: 'continuous',
            }}
          >
            <Image
              source={{ uri: recipe.thumbnailUrl }}
              style={{
                width: 68,
                height: 68,
                borderRadius: radius.sm,
                backgroundColor: colors.border,
              }}
              contentFit="cover"
            />
            <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xs }}>
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.text.primary,
                }}
                numberOfLines={2}
              >
                {recipe.title}
              </Text>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 11,
                  color: colors.text.disabled,
                }}
              >
                {recipe.duration} {recipe.views ? `· ${recipe.views}` : ''}
              </Text>
            </View>
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
    <View
      style={{
        paddingVertical: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text
        style={{
          fontFamily: typography.heading.fontFamily,
          ...typography.heading.h2,
          color: colors.text.primary,
          paddingHorizontal: spacing.lg,
        }}
      >
        {title}
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
