import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { Skeleton } from '@/src/shared/components/skeleton';
import type { RecipeCard, ThemeCard } from '@/src/shared/data/mock';
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
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
}

// CreatingRecipeSection 제거 — 카드별 독립 폴링으로 대체

export function RecentRecipeSection({ recipes, onPress, fetchNextPage, hasNextPage }: RecentRecipeSectionProps) {
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
      <FlashList
        horizontal
        data={recipes}
        renderItem={({ item }: { item: RecipeCard }) => (
          <RecipeCardWithStatus
            recipe={item}
            onPress={onPress}
            voiceModeLabel={t.voiceMode}
            statusCreatingLabel={t.statusCreating}
            statusFailedLabel={t.statusFailed}
          />
        )}
        keyExtractor={(item: RecipeCard) => item.id}
        showsHorizontalScrollIndicator={false}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        ListFooterComponent={hasNextPage ? <RecentRecipeSkeletonFooter /> : null}
      />
    </View>
  );
}

function RecentRecipeSkeletonFooter() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, marginLeft: spacing.md }}>
      {[1, 2].map((i) => (
        <View key={i} style={{ width: 220, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm }}>
          <Skeleton width={68} height={68} borderRadius={radius.sm} />
          <View style={{ flex: 1, gap: spacing.sm, justifyContent: 'center' }}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={12} />
            <Skeleton width="100%" height={28} borderRadius={radius.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── 카드별 독립 폴링 (웹뷰 v2 패턴) ───
// recipeStatus가 SUCCESS 아니면 absolute 오버레이로 폴링 상태 표시.
// 폴링 결과가 SUCCESS가 되면 오버레이 사라지고 정상 카드로 전환.
function RecipeCardWithStatus({ recipe, onPress, voiceModeLabel, statusCreatingLabel, statusFailedLabel }: {
  recipe: RecipeCard;
  onPress: (recipe: RecipeCard) => void;
  voiceModeLabel: string;
  statusCreatingLabel: string;
  statusFailedLabel: string;
}) {
  const isInitiallyDone = !recipe.recipeStatus || recipe.recipeStatus === 'SUCCESS';
  // SUCCESS 카드는 폴링하지 않음 (enabled: false)
  const { data: polledStatus } = useRecipeProgress(isInitiallyDone ? null : recipe.id);

  // 초기 SUCCESS + 폴링 결과 SUCCESS 모두 정상 처리
  const isDone = isInitiallyDone || polledStatus === RecipeStatus.SUCCESS;
  const isFailed = !isDone && (
    polledStatus === RecipeStatus.FAILED ||
    polledStatus === RecipeStatus.BLOCKED ||
    polledStatus === RecipeStatus.BANNED
  );

  return (
    <Pressable
      onPress={() => isDone && onPress(recipe)}
      style={{
        width: 220,
        position: 'relative',
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
        {recipe.title ? (
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
        ) : (
          <View style={{ gap: spacing.xs }}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={14} />
          </View>
        )}
        <Pressable
          onPress={() => isDone && router.push(`/native-step/${recipe.id}`)}
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
            {voiceModeLabel}
          </Text>
        </Pressable>
      </View>

      {/* 생성 중 / 실패 오버레이 — 전체 카드 덮음 */}
      {!isDone && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
          }}
        >
          {isFailed ? (
            <>
              <Ionicons name="alert-circle" size={24} color={colors.semantic.error} />
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, fontWeight: '600', color: '#fff' }}>
                {statusFailedLabel}
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, fontWeight: '600', color: '#fff' }}>
                {statusCreatingLabel}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

type RecipeListSectionProps = {
  title: string;
  icon?: string;
  recipes: RecipeCard[];
  onPress: (recipe: RecipeCard) => void;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
}

export function RecipeListSection({ title, icon, recipes, onPress, fetchNextPage, hasNextPage }: RecipeListSectionProps) {
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
      <FlashList
        horizontal
        data={recipes}
        renderItem={({ item }: { item: RecipeCard }) => (
          <Pressable
            onPress={() => onPress(item)}
            style={{ width: 160, gap: spacing.sm }}
          >
            <Image
              source={{ uri: item.thumbnailUrl }}
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
                {item.title}
              </Text>
              <Text style={{ fontSize: 11, color: colors.text.secondary }}>
                {item.duration} · {item.views}
              </Text>
            </View>
          </Pressable>
        )}
        keyExtractor={(item: RecipeCard) => item.id}
        showsHorizontalScrollIndicator={false}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        ListFooterComponent={hasNextPage ? <RecipeListSkeletonFooter /> : null}
      />
    </View>
  );
}

function RecipeListSkeletonFooter() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, marginLeft: spacing.md }}>
      {[1, 2].map((i) => (
        <View key={i} style={{ width: 160, gap: spacing.sm }}>
          <Skeleton width={160} height={100} borderRadius={radius.md} />
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={11} />
        </View>
      ))}
    </View>
  );
}

// ─── Skeleton 변형 ───

export function RecentRecipeSkeleton() {
  return (
    <View style={{ paddingVertical: spacing.lg, gap: spacing.md }}>
      <View style={{ marginLeft: spacing.lg }}><Skeleton width={140} height={22} /></View>
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
    recentRecipes: '최근 레시피',
    voiceMode: '음성 모드',
    statusFailed: '레시피 생성 실패',
    statusCreating: '레시피 생성 중...',
  },
  GLOBAL: {
    themeTitle: 'What should we cook?',
    themeSubtitle: 'Hand-picked by Tory!',
    recentRecipes: 'Recent Recipes',
    voiceMode: 'Voice Mode',
    statusFailed: 'Creation Failed',
    statusCreating: 'Creating...',
  },
} as const;
