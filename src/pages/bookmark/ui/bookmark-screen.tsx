import { View, Text, Pressable, ScrollView, Alert, ActionSheetIOS, Platform, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { CategoryChips } from '@/src/pages/bookmark/components/category-chips';
import { RecipeGrid } from '@/src/pages/bookmark/components/recipe-grid';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useMyRecipes, useCategorizedRecipes, useCategories } from '@/src/entities/recipe/hooks/use-my-recipes';
import { deleteCategory } from '@/src/entities/recipe/api/user-recipe-api';
import type { UserRecipe, Category } from '@/src/entities/recipe/api/user-recipe-api';
import type { RecipeCard } from '@/src/shared/data/mock';

const TORY_CRY = require('@/assets/images/tory-logo.png');

function toRecipeCards(recipes: UserRecipe[]): RecipeCard[] {
  return recipes
    .filter((r) => r.recipeStatus === 'SUCCESS')
    .map((r) => ({
      id: r.recipeId,
      title: r.recipeTitle,
      thumbnailUrl: r.videoThumbnailUrl,
      duration: r.cookingTime ? `${r.cookingTime}분` : '',
      views: r.channelTitle,
      videoType: r.videoType,
    }));
}

export function BookmarkScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categorySheetRef = useRef<BottomSheet>(null);

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
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '음성 모드로 시작', '삭제'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          title: recipe.title,
        },
        (index) => {
          if (index === 1) router.push(`/native-step/${recipe.id}`);
          if (index === 2) Alert.alert('삭제', `${recipe.title} 삭제`);
        },
      );
    } else {
      Alert.alert(recipe.title, '', [
        { text: '취소', style: 'cancel' },
        { text: '음성 모드', onPress: () => router.push(`/native-step/${recipe.id}`) },
        { text: '삭제', style: 'destructive' },
      ]);
    }
  }, []);

  const handleAddCategory = useCallback(() => {
    Alert.prompt?.('카테고리 추가', '이름을 입력하세요', async (name) => {
      if (!name?.trim()) return;
      try {
        const { createCategory } = await import('@/src/entities/recipe/api/user-recipe-api');
        await createCategory(name.trim());
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } catch {
        Alert.alert('오류', '카테고리 생성에 실패했어요');
      }
    }) ?? Alert.alert('카테고리 추가', '새 카테고리를 만듭니다');
  }, [queryClient]);

  const handleCategoryManage = useCallback(() => {
    categorySheetRef.current?.expand();
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
          <Image source={TORY_CRY} style={{ width: 80, height: 80, opacity: 0.5 }} contentFit="contain" />
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
      <BottomSheet
        ref={categorySheetRef}
        index={-1}
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
            <Pressable onPress={() => categorySheetRef.current?.close()}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {categories.filter((c) => c.id !== 'all').map((cat) => (
            <View
              key={cat.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }}
            >
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary }}>{cat.name}</Text>
              <Pressable onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
              </Pressable>
            </View>
          ))}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
