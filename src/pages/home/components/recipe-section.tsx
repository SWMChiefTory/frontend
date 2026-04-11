import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { Skeleton } from '@/src/shared/components/skeleton';
import type { RecipeCard, ThemeCard } from '@/src/shared/data/mock';
import { useRecipeCreateStore } from '@/src/pages/home/model/recipe-create-store';
import { useRecipeProgress, RecipeStatus } from '@/src/entities/recipe';
import { useMarketStore } from '@/src/shared/store/marketStore';

type ThemeCardsSectionProps = {
  cards: ThemeCard[];
  onPress: (card: ThemeCard) => void;
}

export function ThemeCardsSection({ cards, onPress }: ThemeCardsSectionProps) {
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
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
        {t.themeTitle}
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
        {t.themeSubtitle}
      </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
    >
      {cards.map((card) => (
        <Pressable
          key={card.id}
          onPress={() => onPress(card)}
          style={{ width: 84, alignItems: 'center', gap: spacing.xs }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: '#C4A882',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {card.image && (() => {
              const size =
                card.id === 'night-snack'
                  ? 48
                  : card.id === 'love-meal'
                    ? 54
                    : 60;
              const offsetY =
                card.id === 'bomdong'
                  ? 6
                  : card.id === 'dubai-cookie'
                    ? -2
                    : card.id === 'butter-tteok'
                      ? -1
                      : card.id === 'night-snack'
                        ? 4
                        : card.id === 'love-meal'
                          ? 2
                          : 0;
              return (
                <Image
                  source={card.image}
                  style={{
                    width: size,
                    height: size,
                    transform: [{ translateY: offsetY }],
                  }}
                  contentFit="contain"
                />
              );
            })()}
          </View>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 12,
              fontWeight: '700',
              color: colors.text.primary,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {card.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
    </View>
  );
}

type RecentRecipeSectionProps = {
  recipes: RecipeCard[];
  onPress: (recipe: RecipeCard) => void;
}

export function CreatingRecipeSection() {
  const creating = useRecipeCreateStore((s) => s.creatingRecipes);
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  if (creating.length === 0) return null;

  return (
    <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.xs, gap: spacing.md }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: 2 }}>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            ...typography.heading.h2,
            color: colors.text.primary,
          }}
        >
          {t.creatingTitle}
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 12,
            color: colors.text.secondary,
          }}
        >
          {t.creatingSubtitle}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
      >
        {creating.map((c) => (
          <CreatingRecipeCard key={c.recipeId} recipeId={c.recipeId} />
        ))}
      </ScrollView>
    </View>
  );
}

export function RecentRecipeSection({ recipes, onPress }: RecentRecipeSectionProps) {
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  return (
    <View
      style={{
        paddingTop: spacing.xs,
        paddingBottom: spacing.lg,
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
        {t.recentRecipes}
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
            <View style={{ flex: 1, justifyContent: 'center', gap: spacing.sm }}>
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
              <Pressable
                onPress={() => router.push(`/native-step/${recipe.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  backgroundColor: colors.primary,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.sm,
                  marginTop: 'auto',
                }}
              >
                <Ionicons name="mic" size={12} color="#fff" />
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 11, fontWeight: '600', color: '#fff' }}>
                  {t.voiceMode}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── 생성 중 카드 (최근 레시피 섹션 prepend) ───
function CreatingRecipeCard({ recipeId }: { recipeId: string }) {
  const { data: status } = useRecipeProgress(recipeId);
  const removeCreating = useRecipeCreateStore((s) => s.removeCreating);
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  const isDone = status === RecipeStatus.SUCCESS;
  const isFailed =
    status === RecipeStatus.FAILED ||
    status === RecipeStatus.BLOCKED ||
    status === RecipeStatus.BANNED;

  const statusText = isDone
    ? t.statusDone
    : isFailed
      ? t.statusFailed
      : t.statusCreating;
  const statusColor = isDone ? colors.semantic.success : isFailed ? colors.semantic.error : colors.primary;

  return (
    <View
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
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: radius.sm,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDone ? (
          <Ionicons name="checkmark-circle" size={36} color={colors.semantic.success} />
        ) : isFailed ? (
          <Ionicons name="alert-circle" size={36} color={colors.semantic.error} />
        ) : (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xs }}>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 13,
            fontWeight: '600',
            color: colors.text.primary,
          }}
          numberOfLines={2}
        >
          {t.newRecipe}
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 11,
            fontWeight: '600',
            color: statusColor,
          }}
        >
          {statusText}
        </Text>
        {!isDone && !isFailed && (
          <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '40%',
                backgroundColor: colors.primary,
                borderRadius: 2,
              }}
            />
          </View>
        )}
      </View>
      {/* 실패 시 dismiss 버튼 */}
      {isFailed && (
        <Pressable
          onPress={() => removeCreating(recipeId)}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={16} color={colors.text.disabled} />
        </Pressable>
      )}
    </View>
  );
}

type RecipeListSectionProps = {
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

// ─── Skeleton 변형 ───

export function RecentRecipeSkeleton() {
  return (
    <View style={{ paddingVertical: spacing.lg, gap: spacing.md }}>
      <Skeleton width={140} height={22} style={{ marginLeft: spacing.lg }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ width: 220, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm }}>
            <Skeleton width={68} height={68} borderRadius={radius.sm} />
            <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="50%" height={12} />
              <Skeleton width="100%" height={28} borderRadius={radius.sm} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function RecipeListSkeleton({ title }: { title: string }) {
  return (
    <View style={{ paddingVertical: spacing.lg, gap: spacing.md }}>
      <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary, paddingHorizontal: spacing.lg }}>
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ width: 160, gap: spacing.sm }}>
            <Skeleton width={160} height={100} />
            <Skeleton width={120} height={14} />
            <Skeleton width={80} height={11} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const TEXTS = {
  KOREA: {
    themeTitle: '이런 요리 어때요?',
    themeSubtitle: '토리가 직접 엄선했어요!',
    creatingTitle: '생성 중인 레시피',
    creatingSubtitle: '완료되면 알림으로 알려드릴게요',
    recentRecipes: '최근 레시피',
    voiceMode: '음성 모드',
    newRecipe: '새 레시피',
    statusDone: '생성 완료',
    statusFailed: '레시피 생성 실패',
    statusCreating: '레시피 생성 중...',
  },
  GLOBAL: {
    themeTitle: 'What should we cook?',
    themeSubtitle: 'Hand-picked by Tory!',
    creatingTitle: 'Creating Recipes',
    creatingSubtitle: "We'll notify you when it's ready",
    recentRecipes: 'Recent Recipes',
    voiceMode: 'Voice Mode',
    newRecipe: 'New Recipe',
    statusDone: 'Done',
    statusFailed: 'Creation Failed',
    statusCreating: 'Creating...',
  },
} as const;
