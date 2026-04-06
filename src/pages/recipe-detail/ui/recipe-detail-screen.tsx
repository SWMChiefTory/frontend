import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useCallback } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useRecipeDetail } from '@/src/entities/recipe/hooks/use-recipe-detail';

interface RecipeDetailScreenProps {
  recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: recipe, isLoading, error } = useRecipeDetail(recipeId);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleStartCooking = useCallback(() => {
    if (recipe) {
      router.push(`/native-step/${recipeId}`);
    }
  }, [recipe, recipeId]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: insets.top }}>
        <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, color: colors.text.primary }}>
          레시피를 찾을 수 없어요
        </Text>
        <Pressable onPress={handleBack} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 영상 썸네일 */}
        <View>
          <Image
            source={{ uri: recipe.videoInfo.videoThumbnailUrl }}
            style={{ width, height: width * 9 / 16, backgroundColor: colors.surface }}
            contentFit="cover"
          />
          {/* 뒤로가기 */}
          <Pressable
            onPress={handleBack}
            style={{
              position: 'absolute',
              top: insets.top + spacing.sm,
              left: spacing.lg,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>

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

          {/* 인분 + 채널 칩 */}
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
                  {recipe.servings}인분
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
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                ...typography.heading.h2,
                color: colors.text.primary,
              }}
            >
              재료
            </Text>
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
                  {(ing.amount || ing.unit) && (
                    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
                      {ing.amount ?? ''}{ing.unit ?? ''}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl }} />

        {/* 단계 */}
        {recipe.steps.length > 0 && (
          <View style={{ padding: spacing.xl, gap: spacing.lg }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                ...typography.heading.h2,
                color: colors.text.primary,
              }}
            >
              레시피
            </Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
                {/* 스텝 번호 */}
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
                {/* 스텝 내용 */}
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
                    <Text
                      key={j}
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: 14,
                        color: colors.text.secondary,
                        lineHeight: 22,
                      }}
                    >
                      {d.text}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
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

      {/* 하단 고정 CTA — 음성 모드로 요리 시작 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleStartCooking}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            borderCurve: 'continuous',
          }}
        >
          <Ionicons name="mic" size={20} color="#fff" />
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 16,
              fontWeight: '700',
              color: '#fff',
            }}
          >
            음성 모드로 요리 시작
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
