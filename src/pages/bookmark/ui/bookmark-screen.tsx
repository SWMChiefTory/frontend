import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { CategoryChips } from '@/src/pages/bookmark/components/category-chips';
import { RecipeGrid } from '@/src/pages/bookmark/components/recipe-grid';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useMyRecipes, useCategorizedRecipes, useCategories } from '@/src/entities/recipe/hooks/use-my-recipes';
import { createCategory, deleteCategory } from '@/src/entities/recipe/api/user-recipe-api';
import { client } from '@/src/modules/shared/api/client';
import type { UserRecipe } from '@/src/entities/recipe/api/user-recipe-api';
import type { RecipeCard } from '@/src/shared/data/mock';

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
    const cats: { id: string; name: string }[] = [{ id: 'all', name: '전체' }];
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
    router.push(`/recipe/${recipe.id}`);
  }, []);

  const handleRecipeLongPress = useCallback((recipe: RecipeCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRecipe(recipe);
    recipeActionSheetRef.current?.present();
  }, []);

  const handleChangeCategory = useCallback(() => {
    recipeActionSheetRef.current?.dismiss();
    setTimeout(() => changeCategorySheetRef.current?.present(), 300);
  }, []);

  const handleSelectCategory = useCallback(async (categoryId: string) => {
    if (!selectedRecipe) return;
    try {
      await client.put(`/recipes/${selectedRecipe.id}/categories`, { category_id: categoryId });
      queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['categorizedRecipes'] });
      changeCategorySheetRef.current?.dismiss();
      setSelectedRecipe(null);
    } catch {
      Alert.alert('오류', '카테고리 변경에 실패했어요');
    }
  }, [selectedRecipe, queryClient]);

  const handleAddCategory = useCallback(() => {
    setNewCategoryName('');
    addCategorySheetRef.current?.present();
  }, []);

  const handleSubmitCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await createCategory(name);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addCategorySheetRef.current?.dismiss();
      setNewCategoryName('');
    } catch {
      Alert.alert('오류', '카테고리 생성에 실패했어요');
    }
  }, [newCategoryName, queryClient]);

  const handleCategoryManage = useCallback(() => {
    categorySheetRef.current?.present();
  }, []);

  const handleDeleteCategory = useCallback(async (cat: { id: string; name: string }) => {
    Alert.alert('삭제', `"${cat.name}" 카테고리를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            if (selectedCategory === cat.id) setSelectedCategory('all');
          } catch {
            Alert.alert('오류', '삭제에 실패했어요');
          }
        },
      },
    ]);
  }, [queryClient, selectedCategory]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.background }}>
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
            나의 레시피
          </Text>
          <Pressable onPress={handleCategoryManage} hitSlop={8}>
            <Ionicons name="list-outline" size={22} color={colors.text.secondary} />
          </Pressable>
        </View>
      </View>

      {/* 카테고리 칩 */}
      <CategoryChips
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onAdd={handleAddCategory}
      />

      {/* 레시피 그리드 */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : recipes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingBottom: 80 }}>
          <Image source={EMPTY_STATE} style={{ width: 120, height: 120 }} contentFit="contain" />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, color: colors.text.disabled }}>
            {selectedCategory === 'all' ? '아직 저장된 레시피가 없어요' : '이 카테고리에 레시피가 없어요'}
          </Text>
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

        snapPoints={['40%']}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
              카테고리 관리
            </Text>
            <Pressable onPress={() => categorySheetRef.current?.dismiss()}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {categories.filter((c) => c.id !== 'all').length === 0 ? (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.disabled, textAlign: 'center', paddingVertical: spacing.xl }}>
              카테고리가 없어요
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
            카테고리 추가
          </Text>
          <BottomSheetTextInput
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="카테고리 이름"
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
              추가하기
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* 레시피 액션 바텀시트 (롱프레스) */}
      <BottomSheetModal
        ref={recipeActionSheetRef}

        enableDynamicSizing
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
            onPress={() => { recipeActionSheetRef.current?.dismiss(); if (selectedRecipe) router.push(`/native-step/${selectedRecipe.id}`); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="mic" size={20} color={colors.primary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>음성 모드로 시작</Text>
          </Pressable>
          <Pressable
            onPress={handleChangeCategory}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="folder-outline" size={20} color={colors.text.secondary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>카테고리 변경</Text>
          </Pressable>
          <Pressable
            onPress={() => { recipeActionSheetRef.current?.dismiss(); Alert.alert('삭제', `${selectedRecipe?.title} 삭제`); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.semantic.error }}>삭제</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* 카테고리 변경 바텀시트 */}
      <BottomSheetModal
        ref={changeCategorySheetRef}

        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ borderRadius: radius.xl }}
      >
        <BottomSheetView style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            카테고리 선택
          </Text>
          {categories.filter((c) => c.id !== 'all').length === 0 ? (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.disabled, paddingVertical: spacing.lg, textAlign: 'center' }}>
              카테고리가 없어요. 먼저 카테고리를 추가해주세요.
            </Text>
          ) : (
            categories.filter((c) => c.id !== 'all').map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => handleSelectCategory(cat.id)}
                style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
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
