import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useRef } from 'react';
import { useMarketStore } from '@/src/shared/store/marketStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const BERRY_ICON = require('@/assets/images/berry-icon.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { Skeleton } from '@/src/shared/components/skeleton';
import { useRecipeDetail, useCreateRecipe } from '@/src/entities/recipe';
import { useBalance } from '@/src/entities/balance';
import { RecipeReportSheet, type RecipeReportSheetRef } from '@/src/widgets/recipe-report/recipe-report-sheet';
import { IngredientPurchaseSheet, type IngredientPurchaseSheetRef } from '@/src/widgets/ingredient-purchase/ingredient-purchase-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { track, RecipeDetailEvents, RecipeEnrollEvents } from '@/src/shared/analytics';

type RecipeDetailScreenProps = {
  recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: recipe, isLoading, error } = useRecipeDetail(recipeId);
  const { data: balance } = useBalance();
  const queryClient = useQueryClient();
  const playerRef = useRef<YoutubeIframeRef>(null);
  const reportSheetRef = useRef<RecipeReportSheetRef>(null);
  const purchaseSheetRef = useRef<IngredientPurchaseSheetRef>(null);
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  const handlePurchasePress = useCallback(() => {
    if (!recipe) return;
    const names = recipe.ingredients.map((i) => i.name).filter((n) => n.length > 0);
    purchaseSheetRef.current?.open(names, recipeId);
  }, [recipe, recipeId]);

  const isEnrolled = recipe?.isEnrolled ?? false;
  const currentBalance = balance?.balance ?? 0;

  // 어떤 버튼에서 enroll 했는지 추적 (floating_button | step_unlock_button)
  const enrollSourceRef = useRef<'floating_button' | 'step_unlock_button'>('floating_button');
  const reachedCookingStartRef = useRef(false);

  const { mutate: createRecipe, isPending: enrolling } = useCreateRecipe({
    onSuccess: () => {
      track(RecipeEnrollEvents.SUCCESS, {
        recipe_id: recipeId,
        source: enrollSourceRef.current,
      });
      queryClient.invalidateQueries({ queryKey: ['recipeDetail', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
      Alert.alert(t.enrollSuccess, t.enrollSuccessDesc);
    },
    onError: (err: any) => {
      track(RecipeEnrollEvents.FAIL, {
        recipe_id: recipeId,
        source: enrollSourceRef.current,
        error_code: err?.response?.data?.errorCode ?? err?.name,
      });
      Alert.alert(t.enrollFailed, err?.message ?? t.enrollFailedDesc);
    },
  });

  // VIEW: 상세 데이터 로드 성공 시 1회. EXIT: unmount 시 stay_duration(초)
  useEffect(() => {
    if (!recipe) return;
    const startedAt = Date.now();
    const totalDetails = recipe.steps.reduce(
      (acc: number, s: any) => acc + (s?.details?.length ?? 0),
      0,
    );
    track(RecipeDetailEvents.VIEW, {
      recipe_id: recipeId,
      recipe_title: recipe.videoInfo.videoTitle,
      total_steps: recipe.steps.length,
      total_details: totalDetails,
      total_ingredients: recipe.ingredients.length,
      has_video: !!recipe.videoInfo.videoId,
    });
    return () => {
      track(RecipeDetailEvents.EXIT, {
        recipe_id: recipeId,
        stay_duration: Math.round((Date.now() - startedAt) / 1000),
        reached_cooking_start: reachedCookingStartRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, recipeId]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleMenuPress = useCallback(() => {
    reportSheetRef.current?.open(recipeId);
  }, [recipeId]);

  const enteredAtRef = useRef(Date.now());
  useEffect(() => { enteredAtRef.current = Date.now(); }, [recipe?.videoInfo.videoId]);

  const triggerEnroll = useCallback((source: 'floating_button' | 'step_unlock_button') => {
    if (!recipe) return;
    enrollSourceRef.current = source;
    track(RecipeEnrollEvents.CLICK, { recipe_id: recipeId, source });
    if (currentBalance < 1) {
      Alert.alert(t.insufficientBerry, t.insufficientBerryDesc);
      return;
    }
    Alert.alert(
      t.enrollRecipe,
      t.enrollRecipeDesc,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.enroll,
          onPress: () => {
            const videoUrl = `https://www.youtube.com/watch?v=${recipe.videoInfo.videoId}`;
            createRecipe(videoUrl);
          },
        },
      ],
    );
  }, [recipe, currentBalance, createRecipe, recipeId]);

  const handleEnroll = useCallback(() => triggerEnroll('floating_button'), [triggerEnroll]);
  const handleStepUnlockEnroll = useCallback(() => triggerEnroll('step_unlock_button'), [triggerEnroll]);

  const handleStartCooking = useCallback(() => {
    if (recipe) {
      reachedCookingStartRef.current = true;
      track(RecipeDetailEvents.COOKING_START, {
        recipe_id: recipeId,
        time_to_start: Math.round((Date.now() - enteredAtRef.current) / 1000),
      });
      router.push(`/native-step/${recipeId}`);
    }
  }, [recipe, recipeId]);

  const seekTo = useCallback((seconds: number, stepOrder?: number, stepTitle?: string) => {
    track(RecipeDetailEvents.VIDEO_SEEK, {
      recipe_id: recipeId,
      video_time: seconds,
      step_order: stepOrder,
      step_title: stepTitle,
    });
    playerRef.current?.seekTo(seconds, true);
  }, [recipeId]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Skeleton width="100%" height={width * 9 / 16} borderRadius={0} />
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Skeleton width="90%" height={26} />
          <Skeleton width="70%" height={16} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton width={70} height={28} borderRadius={radius.full} />
            <Skeleton width={100} height={28} borderRadius={radius.full} />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl }} />
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Skeleton width={60} height={22} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width={70} height={36} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: insets.top }}>
        <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, color: colors.text.primary }}>
          {t.notFound}
        </Text>
        <Pressable onPress={handleBack} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>{t.goBack}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 영상 — 고정 (스크롤 안 됨) */}
      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        {/* 뒤로가기 오버레이 */}
        <Pressable
          onPress={handleBack}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        {/* 더보기 메뉴 */}
        <Pressable
          onPress={handleMenuPress}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </Pressable>

        <YoutubePlayer
          ref={playerRef}
          height={width * 9 / 16}
          width={width}
          videoId={recipe.videoInfo.videoId}
          play={false}
          webViewProps={{
            allowsInlineMediaPlayback: true,
          }}
        />
      </View>

      {/* 스크롤 콘텐츠 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 레시피 요약 */}
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 22,
              fontWeight: '700',
              color: colors.text.primary,
              lineHeight: 30,
            }}
            numberOfLines={2}
          >
            {recipe.videoInfo.videoTitle}
          </Text>

          {recipe.description ? (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                ...typography.body.medium,
                color: colors.text.secondary,
                lineHeight: 22,
              }}
              numberOfLines={3}
            >
              {recipe.description}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {recipe.servings > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                }}
              >
                <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
                  {t.servings(recipe.servings)}
                </Text>
              </View>
            )}
            {recipe.videoInfo.channelTitle ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                }}
              >
                <Ionicons name="videocam-outline" size={14} color={colors.text.secondary} />
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
                  {recipe.videoInfo.channelTitle}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl }} />

        {/* 재료 */}
        {recipe.ingredients.length > 0 && (
          <View style={{ padding: spacing.xl, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary }}>
                {t.ingredients}
              </Text>
              <Pressable
                onPress={handlePurchasePress}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  backgroundColor: pressed ? colors.primary : colors.primaryLight,
                })}
              >
                <Ionicons name="cart" size={14} color={colors.primary} />
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  {t.buyOnCoupang}
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {recipe.ingredients.map((ing, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    borderCurve: 'continuous',
                  }}
                >
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, fontWeight: '500', color: colors.text.primary }}>
                    {ing.name}
                  </Text>
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
                    {ing.amount && ing.amount !== 0 ? `${ing.amount}${ing.unit ?? ''}` : t.referVideo}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl }} />

        {/* 단계 */}
        {recipe.steps.length > 0 && (
          <View style={{ padding: spacing.xl, gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary }}>
                {t.recipe}
              </Text>
              {!isEnrolled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="lock-closed" size={12} color={colors.text.disabled} />
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.disabled }}>
                    {t.preview}
                  </Text>
                </View>
              )}
            </View>
            {(isEnrolled ? recipe.steps : recipe.steps.slice(0, 1)).map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text
                    style={{
                      fontFamily: typography.heading.fontFamily,
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.primary,
                    }}
                  >
                    {step.subtitle}
                  </Text>
                  {step.details.map((d, j) => (
                    <Pressable
                      key={j}
                      onPress={() => seekTo(d.start, i + 1, step.subtitle)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radius.md,
                        borderCurve: 'continuous',
                        backgroundColor: pressed ? colors.primaryLight : colors.surface,
                      })}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: colors.primaryLight,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: typography.heading.fontFamily,
                            fontSize: 11,
                            fontWeight: '700',
                            color: colors.primary,
                          }}
                        >
                          {j + 1}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 14,
                          fontWeight: '500',
                          color: colors.text.primary,
                          lineHeight: 20,
                          flex: 1,
                        }}
                      >
                        {d.text}
                      </Text>
                      <Ionicons name="play" size={16} color={colors.primary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            {!isEnrolled && recipe.steps.length > 1 && (
              <Pressable
                onPress={handleStepUnlockEnroll}
                style={{
                  marginTop: spacing.md,
                  paddingVertical: spacing.xl,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  backgroundColor: colors.primaryLight,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: colors.primary,
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="lock-closed" size={22} color={colors.primary} />
                </View>
                <Text
                  style={{
                    fontFamily: typography.heading.fontFamily,
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.text.primary,
                    marginTop: spacing.xs,
                  }}
                >
                  {t.stepsLocked(recipe.steps.length - 1)}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 12,
                    color: colors.text.secondary,
                    textAlign: 'center',
                  }}
                >
                  {t.enrollToUnlock}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 태그 */}
        {recipe.tags.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {recipe.tags.map((tag, i) => (
                <Text
                  key={i}
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 13,
                    color: colors.primary,
                  }}
                >
                  #{tag}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 플로팅 버튼: 등록 안 된 레시피 → 등록 / 등록된 레시피 → 음성 모드 */}
      <Pressable
        onPress={isEnrolled ? handleStartCooking : handleEnroll}
        disabled={enrolling}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.full,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          borderCurve: 'continuous',
          opacity: enrolling ? 0.6 : 1,
        }}
      >
        {isEnrolled ? (
          <>
            <Ionicons name="mic" size={20} color="#fff" />
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {t.voiceMode}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {enrolling ? t.enrolling : t.enrollRecipe}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: radius.full,
                marginLeft: 4,
              }}
            >
              <Image source={BERRY_ICON} style={{ width: 14, height: 14 }} contentFit="contain" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>1</Text>
            </View>
          </>
        )}
      </Pressable>

      <RecipeReportSheet ref={reportSheetRef} />
      <IngredientPurchaseSheet ref={purchaseSheetRef} />
    </View>
  );
}

const TEXTS = {
  KOREA: {
    notFound: '레시피를 찾을 수 없어요',
    goBack: '돌아가기',
    servings: (n: number) => `${n}인분`,
    buyOnCoupang: '쿠팡에서 구매',
    ingredients: '재료',
    referVideo: '영상참고',
    recipe: '레시피',
    preview: '미리보기',
    stepsLocked: (n: number) => `나머지 ${n}단계가 잠겨있어요`,
    enrollToUnlock: '레시피를 등록하고 전체 단계를 확인하세요',
    insufficientBerry: '베리 부족',
    insufficientBerryDesc: '베리가 부족해요. 충전 후 다시 시도해주세요.',
    enrollRecipe: '레시피 등록',
    enrollRecipeDesc: '베리 1개를 사용해 이 레시피를 등록할까요?',
    cancel: '취소',
    enroll: '등록',
    enrollSuccess: '등록 완료',
    enrollSuccessDesc: '레시피가 내 레시피에 추가되었어요!',
    enrollFailed: '등록 실패',
    enrollFailedDesc: '레시피 등록에 실패했어요',
    enrolling: '등록 중...',
    voiceMode: '음성 모드',
  },
  GLOBAL: {
    notFound: 'Recipe not found',
    goBack: 'Go back',
    servings: (n: number) => `${n} servings`,
    buyOnCoupang: 'Buy on Coupang',
    ingredients: 'Ingredients',
    referVideo: 'See video',
    recipe: 'Recipe',
    preview: 'Preview',
    stepsLocked: (n: number) => `${n} more steps are locked`,
    enrollToUnlock: 'Enroll this recipe to see all steps',
    insufficientBerry: 'Not enough berries',
    insufficientBerryDesc: 'You need more berries. Please recharge and try again.',
    enrollRecipe: 'Enroll Recipe',
    enrollRecipeDesc: 'Use 1 Berry to enroll this recipe?',
    cancel: 'Cancel',
    enroll: 'Enroll',
    enrollSuccess: 'Enrolled!',
    enrollSuccessDesc: 'The recipe has been added to your collection!',
    enrollFailed: 'Enrollment Failed',
    enrollFailedDesc: 'Failed to enroll this recipe',
    enrolling: 'Enrolling...',
    voiceMode: 'Voice Mode',
  },
} as const;
