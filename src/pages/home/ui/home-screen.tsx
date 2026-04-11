import { ScrollView, View, Alert, Modal, Text, Pressable, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { CreditRechargeSheet, type CreditRechargeSheetRef } from '@/src/widgets/credit-recharge/credit-recharge-sheet';
import { CreatingRecipeWatcher } from '@/src/pages/home/components/creating-recipe-watcher';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { HomeHeader } from '@/src/pages/home/components/home-header';
import { FeatureCards } from '@/src/pages/home/components/feature-cards';
import { ThemeCardsSection, RecipeListSection, RecentRecipeSection, RecentRecipeSkeleton, RecipeListSkeleton, CreatingRecipeSection } from '@/src/pages/home/components/recipe-section';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useMarketStore } from '@/src/shared/store/marketStore';
import {
  MOCK_THEME_CARDS,
  MOCK_HOT_RECIPES,
  MOCK_RECENT_RECIPES,
} from '@/src/shared/data/mock';
import { useRecommendRecipes, useMyRecipes } from '@/src/entities/recipe';
import { RecommendType } from '@/src/entities/recipe/api/recommend-api';
import type { RecipeCard } from '@/src/shared/data/mock';
import { track, RechargeEvents, RecipeEvents } from '@/src/shared/analytics';

function toRecipeCards(data: any[] | undefined): RecipeCard[] {
  if (!data) return [];
  return data.map((r) => ({
    id: r.recipeId,
    title: r.recipeTitle,
    thumbnailUrl: r.videoThumbnailUrl,
    duration: r.cookingTime ? `${r.cookingTime}분` : '',
    views: r.channelTitle ?? '',
    description: r.description ?? '',
    servings: r.servings ?? 0,
    cookingTime: r.cookingTime ?? 0,
  }));
}

type HomeScreenProps = {
  onCreatePress?: () => void;
}

export function HomeScreen({ onCreatePress: onCreatePressExternal }: HomeScreenProps) {
  const [lockedModal, setLockedModal] = useState<string | null>(null);
  const rechargeSheetRef = useRef<CreditRechargeSheetRef>(null);
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  const { data: popularData, isLoading: popularLoading } = useRecommendRecipes(RecommendType.POPULAR);
  const { data: myRecipesData, isLoading: myRecipesLoading } = useMyRecipes();

  const hotRecipes = useMemo(() => {
    const apiCards = toRecipeCards(popularData?.data);
    return apiCards.length > 0 ? apiCards : MOCK_HOT_RECIPES;
  }, [popularData]);

  const recentRecipes = useMemo(() => {
    const apiCards = toRecipeCards(myRecipesData?.data);
    return apiCards;
  }, [myRecipesData]);

  const handleBerryPress = useCallback(() => {
    track(RechargeEvents.CLICK, { source: 'home_header' });
    rechargeSheetRef.current?.open();
  }, []);

  const handleSearchPress = useCallback(() => {
    router.push('/search');
  }, []);

  const handleSettingsPress = useCallback(() => {
    router.push('/settings');
  }, []);

  const handleCreatePress = useCallback(() => {
    onCreatePressExternal?.();
  }, [onCreatePressExternal]);

  const handleLockedPress = useCallback((feature: string) => {
    setLockedModal(feature);
  }, []);

  const handleThemePress = useCallback((card: any) => {
    router.push(`/theme/${card.id}`);
  }, []);

  const handleRecipePress = useCallback((recipe: any) => {
    track(RecipeEvents.USER_RECIPE_CLICK, {
      source: 'home',
      recipe_id: String(recipe.id),
      recipe_title: recipe.title,
    });
    router.push(`/recipe/${recipe.id}`);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 고정 헤더 영역 */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingBottom: spacing.lg,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
          borderWidth: 1,
          borderTopWidth: 0,
          borderColor: '#C8C8C8',
        }}
      >
        <HomeHeader
          onBerryPress={handleBerryPress}
          onSearchPress={handleSearchPress}
          onSettingsPress={handleSettingsPress}
        />
        <FeatureCards
          onCreatePress={handleCreatePress}
          onLockedPress={handleLockedPress}
        />
      </View>

      {/* 스크롤 콘텐츠 영역 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.xl, gap: spacing.lg }}
      >
        <CreatingRecipeSection />
        {myRecipesLoading ? (
          <RecentRecipeSkeleton />
        ) : recentRecipes.length > 0 ? (
          <>
            <RecentRecipeSection
              recipes={recentRecipes}
              onPress={handleRecipePress}
            />
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />
          </>
        ) : null}

        {market !== 'GLOBAL' && (
          <>
            <ThemeCardsSection
              cards={MOCK_THEME_CARDS}
              onPress={handleThemePress}
            />
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />
          </>
        )}

        {popularLoading ? (
          <RecipeListSkeleton title={t.hotRecipes} />
        ) : (
          <RecipeListSection
            title={t.hotRecipes}
            recipes={hotRecipes}
            onPress={handleRecipePress}
          />
        )}
      </ScrollView>

      {/* 잠금 기능 모달 */}
      <Modal visible={!!lockedModal} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setLockedModal(null)}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.xl,
              padding: spacing.xxl,
              width: 280,
              alignItems: 'center',
              gap: spacing.lg,
              borderCurve: 'continuous',
            }}
          >
            <Ionicons name="lock-closed" size={40} color={colors.text.disabled} />
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
              {t.comingSoon}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
              {t.comingSoonDesc(lockedModal ?? '')}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary }}>
              {t.needThisFeature}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => {
                  Alert.alert(t.thankYou, t.recommendationApplied);
                  setLockedModal(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  {t.yes}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLockedModal(null)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>
                  {t.no}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <CreditRechargeSheet ref={rechargeSheetRef} />
      <CreatingRecipeWatcher />
    </View>
  );
}

const TEXTS = {
  KOREA: {
    hotRecipes: '지금 핫한 레시피',
    comingSoon: '준비 중이에요',
    comingSoonDesc: (feature: string) => `${feature} 기능이\n곧 출시될 예정이에요!`,
    needThisFeature: '이 기능이 필요하신가요?',
    thankYou: '감사합니다!',
    recommendationApplied: '추천이 반영되었습니다.',
    yes: '👍 필요해',
    no: '👎 괜찮아',
  },
  GLOBAL: {
    hotRecipes: 'Trending Recipes',
    comingSoon: 'Coming Soon',
    comingSoonDesc: (feature: string) => `${feature} is\ncoming soon!`,
    needThisFeature: 'Do you need this feature?',
    thankYou: 'Thank you!',
    recommendationApplied: 'Your feedback has been noted.',
    yes: '👍 Yes, I need it',
    no: '👎 Not really',
  },
} as const;
