import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/src/shared/design/tokens';
import type { ThemeData } from '@/src/entities/theme';
import { ThemeBanner } from '../components/theme-banner';
import { DishListCard } from '../components/dish-list-card';
import { MoodSelectorSheet, type MoodSelectorSheetRef } from '../components/mood-selector-sheet';
import { CategorySelectorSheet, type CategorySelectorSheetRef } from '../components/category-selector-sheet';
import { track, ThemeEvents } from '@/src/shared/analytics';

interface ThemeDetailScreenProps {
  theme: ThemeData;
}

export function ThemeDetailScreen({ theme }: ThemeDetailScreenProps) {
  const isDark = theme.mode === 'dark';

  // ─── 카테고리 우선 (있으면 mood 모달 대신 사용) ───
  const useCategoryMode = !!theme.categories && theme.categories.length > 0;

  const allMoods = useMemo(() => {
    const moodSet = new Set<string>();
    theme.dishes.forEach((d) => d.tags.mood.forEach((m) => moodSet.add(m)));
    return Array.from(moodSet);
  }, [theme]);

  // null = 전체, string = 특정 mood/category
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const moodSheetRef = useRef<MoodSelectorSheetRef>(null);
  const categorySheetRef = useRef<CategorySelectorSheetRef>(null);

  // mood selector는 카테고리 시스템으로 대체됨 → 비활성화.
  // 카테고리가 없는 테마는 그냥 dish 전체 flat 노출.
  const enableMoodSelector = false;

  // 첫 진입 시 자동 오픈
  useEffect(() => {
    console.log('[ThemeDetail] mount', {
      themeId: theme.id,
      useCategoryMode,
      categoriesCount: theme.categories?.length,
      dishesCount: theme.dishes.length,
    });
    if (useCategoryMode) {
      // BottomSheet 마운트 + 애니메이션 안정화 대기 (500ms)
      const t = setTimeout(() => {
        console.log('[ThemeDetail] expand category sheet, ref:', !!categorySheetRef.current);
        categorySheetRef.current?.open();
      }, 500);
      return () => clearTimeout(t);
    }
    if (!enableMoodSelector || allMoods.length === 0) return;
    const t = setTimeout(() => moodSheetRef.current?.open(), 500);
    return () => clearTimeout(t);
  }, [useCategoryMode, enableMoodSelector, allMoods.length, theme.id, theme.categories?.length, theme.dishes.length]);

  const filteredDishes = useMemo(() => {
    if (useCategoryMode) {
      if (!selectedCategoryId) return theme.dishes;
      return theme.dishes.filter((d) => d.category === selectedCategoryId);
    }
    if (!selectedMood) return theme.dishes;
    return theme.dishes.filter((d) => d.tags.mood.includes(selectedMood));
  }, [theme, selectedMood, selectedCategoryId, useCategoryMode]);

  const selectedCategory = useMemo(
    () => theme.categories?.find((c) => c.id === selectedCategoryId) ?? null,
    [theme.categories, selectedCategoryId],
  );

  const handleSelectMood = useCallback(
    (mood: string | null) => {
      setSelectedMood(mood);
      moodSheetRef.current?.close();
      if (mood) {
        track(ThemeEvents.FILTER_SELECT, { theme_id: String(theme.id), filter: mood });
      }
    },
    [theme.id],
  );

  const handleSelectCategory = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      categorySheetRef.current?.close();
      if (categoryId) {
        track(ThemeEvents.FILTER_SELECT, { theme_id: String(theme.id), filter: categoryId });
      }
    },
    [theme.id],
  );

  const otherMoods = useMemo(
    () => allMoods.filter((m) => m !== selectedMood),
    [allMoods, selectedMood],
  );

  const otherCategories = useMemo(
    () => (theme.categories ?? []).filter((c) => c.id !== selectedCategoryId),
    [theme.categories, selectedCategoryId],
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <ThemeBanner
          theme={theme}
          selectedCategory={useCategoryMode ? selectedCategory : null}
          onChangeCategory={() => categorySheetRef.current?.open()}
        />

        {/* 활성 mood 표시 + 변경 */}
        {enableMoodSelector && selectedMood ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.full,
                backgroundColor: theme.color,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            >
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#fff',
                }}
              >
                {selectedMood}
              </Text>
            </View>
            <Pressable
              onPress={() => moodSheetRef.current?.open()}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: radius.full,
                backgroundColor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#555',
                }}
              >
                바꾸기
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* 요리 리스트 (에디토리얼 카드) */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl, marginTop: spacing.sm }}>
          {filteredDishes.map((dish) => (
            <DishListCard
              key={dish.id}
              dish={dish}
              isDark={isDark}
              themeId={String(theme.id)}
              themeColor={theme.color}
            />
          ))}
        </View>

        {filteredDishes.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: spacing.sm }}>
            <Ionicons name="search-outline" size={32} color={colors.text.disabled} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                ...typography.body.medium,
                color: colors.text.disabled,
              }}
            >
              {useCategoryMode
                ? '이 카테고리의 요리가 아직 없어요'
                : '이 분위기의 요리가 아직 없어요'}
            </Text>
          </View>
        )}

        {/* 카테고리 모드 — 다른 카테고리 추천 */}
        {useCategoryMode && selectedCategoryId && otherCategories.length > 0 && (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                paddingHorizontal: spacing.lg,
              }}
            >
              이런 카테고리는 어때요?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
            >
              {otherCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => handleSelectCategory(cat.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: radius.full,
                    backgroundColor: pressed ? theme.color : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.08)',
                  })}
                >
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: typography.heading.fontFamily,
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text.primary,
                    }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 다른 분위기 추천 */}
        {enableMoodSelector && selectedMood && otherMoods.length > 0 && (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                paddingHorizontal: spacing.lg,
              }}
            >
              이런 분위기는 어때요?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
            >
              {otherMoods.map((mood) => (
                <Pressable
                  key={mood}
                  onPress={() => handleSelectMood(mood)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: radius.full,
                    backgroundColor: pressed ? theme.color : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.08)',
                  })}
                >
                  <Text
                    style={{
                      fontFamily: typography.heading.fontFamily,
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text.primary,
                    }}
                  >
                    {mood}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <MoodSelectorSheet
        ref={moodSheetRef}
        moods={allMoods}
        themeColor={theme.color}
        themeTitle={theme.title}
        onSelect={handleSelectMood}
      />

      {useCategoryMode && theme.categories ? (
        <CategorySelectorSheet
          ref={categorySheetRef}
          themeId={String(theme.id)}
          categories={theme.categories}
          themeColor={theme.color}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
        />
      ) : null}
    </View>
  );
}
