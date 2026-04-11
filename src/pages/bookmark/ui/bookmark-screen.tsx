import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useMarketStore } from '@/src/shared/store/marketStore';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { CategoryChips } from '@/src/pages/bookmark/components/category-chips';
import { CreatingRecipeSection } from '@/src/pages/home/components/recipe-section';
import { RecipeGrid } from '@/src/pages/bookmark/components/recipe-grid';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useMyRecipes, useCategorizedRecipes, useCategories } from '@/src/entities/recipe';
import { createCategory, deleteCategory, deleteUserRecipe } from '@/src/entities/recipe/api/user-recipe-api';
import { client } from '@/src/shared/api/client';
import type { UserRecipe } from '@/src/entities/recipe/api/user-recipe-api';
import type { RecipeCard } from '@/src/shared/data/mock';
import { track, RecipeEvents, CategoryEvents } from '@/src/shared/analytics';

const EMPTY_STATE = require('@/assets/images/empty-state.png');

function toRecipeCards(recipes: UserRecipe[]): RecipeCard[] {
  return recipes
    .filter((r) => r.recipeStatus === 'SUCCESS')
    .map((r) => ({
      id: r.recipeId,
      title: r.recipeTitle,
      thumbnailUrl: r.videoThumbnailUrl,
      duration: r.cookingTime ? `${r.cookingTime}분` : '',
      views: r.channelTitle,
    }));
}

export function BookmarkScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categorySheetRef = useRef<BottomSheetModal>(null);
  const addCategorySheetRef = useRef<BottomSheetModal>(null);
  const recipeActionSheetRef = useRef<BottomSheetModal>(null);
  const changeCategorySheetRef = useRef<BottomSheetModal>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCard | null>(null);

  const { data: categoriesData } = useCategories();
  const { data: allRecipesData, isLoading: allLoading } = useMyRecipes();
  const { data: catRecipesData, isLoading: catLoading } = useCategorizedRecipes(
    selectedCategory !== 'all' ? selectedCategory : null,
  );

  const categories = useMemo(() => {
    const cats: { id: string; name: string }[] = [{ id: 'all', name: t.all }];
    if (categoriesData) {
      cats.push(...categoriesData.map((c) => ({ id: c.categoryId, name: c.name })));
    }
    return cats;
  }, [categoriesData]);

  const recipes = useMemo(() => {
    if (selectedCategory === 'all') {
      return toRecipeCards(allRecipesData?.data ?? []);
    }
    return toRecipeCards(catRecipesData?.data ?? []);
  }, [selectedCategory, allRecipesData, catRecipesData]);

  const isLoading = selectedCategory === 'all' ? allLoading : catLoading;

  const handleRecipePress = useCallback((recipe: RecipeCard) => {
    track(RecipeEvents.USER_RECIPE_CLICK, {
      source: 'user_recipe',
      recipe_id: String(recipe.id),
      recipe_title: recipe.title,
    });
    router.push(`/recipe/${recipe.id}`);
  }, []);

  const handleSelectCategoryChip = useCallback((id: string) => {
    setSelectedCategory(id);
    const cat = categories.find((c) => c.id === id);
    track(CategoryEvents.SELECT, {
      source: 'user_recipe',
      category_id: id,
      category_name: cat?.name,
    });
  }, [categories]);

  const handleRecipeLongPress = useCallback((recipe: RecipeCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRecipe(recipe);
    recipeActionSheetRef.current?.present();
  }, []);

  const handleChangeCategory = useCallback(() => {
    if (selectedRecipe) {
      track(CategoryEvents.MOVE_OPEN, { recipe_id: String(selectedRecipe.id) });
    }
    recipeActionSheetRef.current?.dismiss();
    setTimeout(() => changeCategorySheetRef.current?.present(), 300);
  }, [selectedRecipe]);

  const handleSelectCategory = useCallback(async (categoryId: string) => {
    if (!selectedRecipe) return;
    try {
      await client.put(`/recipes/${selectedRecipe.id}/categories`, { category_id: categoryId });
      const target = categories.find((c) => c.id === categoryId);
      track(CategoryEvents.MOVE_SUCCESS, {
        recipe_id: String(selectedRecipe.id),
        target_category_id: categoryId,
        target_category_name: target?.name ?? '',
      });
      queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['categorizedRecipes'] });
      changeCategorySheetRef.current?.dismiss();
      setSelectedRecipe(null);
    } catch {
      Alert.alert(t.error, t.categoryChangeFailed);
    }
  }, [selectedRecipe, categories, queryClient]);

  const handleAddCategory = useCallback(() => {
    track(CategoryEvents.CREATE_OPEN);
    setNewCategoryName('');
    addCategorySheetRef.current?.present();
  }, []);

  const handleSubmitCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await createCategory(name);
      track(CategoryEvents.CREATE_SUCCESS, { category_name: name });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addCategorySheetRef.current?.dismiss();
      setNewCategoryName('');
    } catch {
      Alert.alert(t.error, t.categoryCreateFailed);
    }
  }, [newCategoryName, queryClient]);

  const handleCategoryManage = useCallback(() => {
    categorySheetRef.current?.present();
  }, []);

  const handleDeleteCategory = useCallback(async (cat: { id: string; name: string }) => {
    track(CategoryEvents.DELETE_OPEN, {
      category_id: cat.id,
      category_name: cat.name,
    });
    const recipeCount =
      categoriesData?.find((c) => c.categoryId === cat.id)?.count ?? 0;
    Alert.alert(t.delete, t.deleteCategoryConfirm(cat.name), [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
            track(CategoryEvents.DELETE_SUCCESS, {
              category_id: cat.id,
              category_name: cat.name,
              recipe_count: recipeCount,
            });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            if (selectedCategory === cat.id) setSelectedCategory('all');
          } catch {
            Alert.alert(t.error, t.deleteFailed);
          }
        },
      },
    ]);
  }, [queryClient, selectedCategory, categoriesData]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            height: 48,
          }}
        >
          <Text style={{ fontFamily: typography.heading.fontFamily, ...typography.heading.h2, color: colors.text.primary }}>
            {t.myRecipes}
          </Text>
          <Pressable onPress={handleCategoryManage} hitSlop={8}>
            <Ionicons name="list-outline" size={22} color={colors.text.secondary} />
          </Pressable>
        </View>
      </View>

      {/* 생성 중 레시피 섹션 */}
      <CreatingRecipeSection />

      {/* 카테고리 칩 */}
      <CategoryChips
        categories={categories}
        selected={selectedCategory}
        onSelect={handleSelectCategoryChip}
        onAdd={handleAddCategory}
      />

      {/* 레시피 그리드 */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : recipes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingBottom: 80 }}>
          <Image source={EMPTY_STATE} style={{ width: 140, height: 140 }} contentFit="contain" />
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              {selectedCategory === 'all' ? t.emptyAll : t.emptyCategory}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
              {t.emptyHint}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
        >
          <RecipeGrid
            recipes={recipes}
            onPress={handleRecipePress}
            onLongPress={handleRecipeLongPress}
          />
        </ScrollView>
      )}

      {/* 카테고리 관리 바텀시트 */}
      <BottomSheetModal
        ref={categorySheetRef}
        enableDynamicSizing
        detached
        bottomInset={60}
        style={{ marginHorizontal: 16 }}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
              {t.categoryManage}
            </Text>
            <Pressable onPress={() => categorySheetRef.current?.dismiss()}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {categories.filter((c) => c.id !== 'all').length === 0 ? (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.disabled, textAlign: 'center', paddingVertical: spacing.xl }}>
              {t.noCategories}
            </Text>
          ) : (
            categories.filter((c) => c.id !== 'all').map((cat) => (
              <View
                key={cat.id}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}
              >
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>{cat.name}</Text>
                <Pressable onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
                </Pressable>
              </View>
            ))
          )}
        </BottomSheetView>
      </BottomSheetModal>

      {/* 카테고리 추가 바텀시트 */}
      <BottomSheetModal
        ref={addCategorySheetRef}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            {t.categoryAdd}
          </Text>
          <BottomSheetTextInput
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder={t.categoryNamePlaceholder}
            placeholderTextColor={colors.text.disabled}
            autoFocus
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 15,
              color: colors.text.primary,
              borderWidth: 1,
              borderColor: newCategoryName.trim() ? colors.primary : colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
            }}
          />
          <Pressable
            onPress={handleSubmitCategory}
            disabled={!newCategoryName.trim()}
            style={{
              backgroundColor: newCategoryName.trim() ? colors.primary : colors.border,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, fontWeight: '600', color: '#fff' }}>
              {t.addButton}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* 레시피 액션 바텀시트 (롱프레스) */}
      <BottomSheetModal
        ref={recipeActionSheetRef}

        enableDynamicSizing
        detached
        bottomInset={60}
        style={{ marginHorizontal: 16 }}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.xl, gap: spacing.sm }}>
          {selectedRecipe && (
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm }} numberOfLines={1}>
              {selectedRecipe.title}
            </Text>
          )}
          <Pressable
            onPress={() => {
              recipeActionSheetRef.current?.dismiss();
              if (selectedRecipe) {
                // cooking_mode_start는 RecipeStepScreen mount 시 totals 포함해서 발화됨
                router.push(`/native-step/${selectedRecipe.id}`);
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="mic" size={20} color={colors.primary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>{t.startVoiceMode}</Text>
          </Pressable>
          <Pressable
            onPress={handleChangeCategory}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="folder-outline" size={20} color={colors.text.secondary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>{t.changeCategory}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const recipe = selectedRecipe;
              recipeActionSheetRef.current?.dismiss();
              if (!recipe) return;
              Alert.alert(
                t.deleteRecipe,
                t.deleteRecipeConfirm(recipe.title),
                [
                  { text: t.cancel, style: 'cancel' },
                  {
                    text: t.delete,
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteUserRecipe(recipe.id);
                        track(RecipeEvents.UNENROLL_BOOKMARK, { recipe_id: String(recipe.id) });
                        queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
                        queryClient.invalidateQueries({ queryKey: ['categorizedRecipes'] });
                      } catch {
                        Alert.alert(t.error, t.deleteFailed);
                      }
                    },
                  },
                ],
              );
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.semantic.error }}>{t.delete}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* 카테고리 변경 바텀시트 */}
      <BottomSheetModal
        ref={changeCategorySheetRef}

        enableDynamicSizing
        detached
        bottomInset={60}
        style={{ marginHorizontal: 16 }}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            {t.categorySelect}
          </Text>
          {categories.filter((c) => c.id !== 'all').length === 0 ? (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.disabled, paddingVertical: spacing.lg, textAlign: 'center' }}>
              {t.noCategoriesHint}
            </Text>
          ) : (
            categories.filter((c) => c.id !== 'all').map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => handleSelectCategory(cat.id)}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  marginVertical: spacing.xs,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>{cat.name}</Text>
              </Pressable>
            ))
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const TEXTS = {
  KOREA: {
    all: '전체',
    myRecipes: '나의 레시피',
    emptyAll: '아직 저장된 레시피가 없어요',
    emptyCategory: '이 카테고리에 레시피가 없어요',
    emptyHint: '유튜브 URL로 첫 레시피를 만들어보세요!',
    categoryManage: '카테고리 관리',
    noCategories: '카테고리가 없어요',
    noCategoriesHint: '카테고리가 없어요. 먼저 카테고리를 추가해주세요.',
    categoryAdd: '카테고리 추가',
    categoryNamePlaceholder: '카테고리 이름',
    addButton: '추가하기',
    categorySelect: '카테고리 선택',
    startVoiceMode: '음성 모드로 시작',
    changeCategory: '카테고리 변경',
    delete: '삭제',
    deleteRecipe: '레시피 삭제',
    deleteRecipeConfirm: (title: string) => `"${title}"을(를) 삭제할까요?`,
    deleteCategoryConfirm: (name: string) => `"${name}" 카테고리를 삭제할까요?`,
    cancel: '취소',
    error: '오류',
    categoryChangeFailed: '카테고리 변경에 실패했어요',
    categoryCreateFailed: '카테고리 생성에 실패했어요',
    deleteFailed: '삭제에 실패했어요',
  },
  GLOBAL: {
    all: 'All',
    myRecipes: 'My Recipes',
    emptyAll: 'No recipes saved yet',
    emptyCategory: 'No recipes in this category',
    emptyHint: 'Add your first recipe with a YouTube URL!',
    categoryManage: 'Manage Categories',
    noCategories: 'No categories yet',
    noCategoriesHint: 'No categories found. Please add one first.',
    categoryAdd: 'Add Category',
    categoryNamePlaceholder: 'Category name',
    addButton: 'Add',
    categorySelect: 'Select Category',
    startVoiceMode: 'Start Voice Mode',
    changeCategory: 'Change Category',
    delete: 'Delete',
    deleteRecipe: 'Delete Recipe',
    deleteRecipeConfirm: (title: string) => `Delete "${title}"?`,
    deleteCategoryConfirm: (name: string) => `Delete category "${name}"?`,
    cancel: 'Cancel',
    error: 'Error',
    categoryChangeFailed: 'Failed to change category',
    categoryCreateFailed: 'Failed to create category',
    deleteFailed: 'Failed to delete',
  },
} as const;
