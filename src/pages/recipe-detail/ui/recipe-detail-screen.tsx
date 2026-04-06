import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { Skeleton } from '@/src/shared/components/skeleton';
import { useRecipeDetail } from '@/src/entities/recipe/hooks/use-recipe-detail';

interface RecipeDetailScreenProps {
  recipeId: string;
}

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: recipe, isLoading, error } = useRecipeDetail(recipeId);
  const playerRef = useRef<YoutubeIframeRef>(null);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleStartCooking = useCallback(() => {
    if (recipe) {
      router.push(`/native-step/${recipeId}`);
    }
  }, [recipe, recipeId]);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

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
            <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary }}>
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
            <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary }}>
              레시피
            </Text>
            {recipe.steps.map((step, i) => (
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
                      onPress={() => seekTo(d.start)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: spacing.sm,
                        paddingVertical: spacing.xs,
                      }}
                    >
                      <Ionicons name="play-circle-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 14,
                          color: colors.text.secondary,
                          lineHeight: 22,
                          flex: 1,
                        }}
                      >
                        {d.text}
                      </Text>
                    </Pressable>
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

      {/* 플로팅 음성 모드 버튼 */}
      <Pressable
        onPress={handleStartCooking}
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
        }}
      >
        <Ionicons name="mic" size={20} color="#fff" />
        <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 15, fontWeight: '700', color: '#fff' }}>
          음성 모드
        </Text>
      </Pressable>
    </View>
  );
}
