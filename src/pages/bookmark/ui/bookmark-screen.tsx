import { View, Text, Pressable, ScrollView, Alert, ActionSheetIOS, Platform } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { CategoryChips } from '@/src/pages/bookmark/components/category-chips';
import { RecipeGrid } from '@/src/pages/bookmark/components/recipe-grid';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { MOCK_CATEGORIES, MOCK_MY_RECIPES } from '@/src/shared/data/mock';
import type { RecipeCard, Category } from '@/src/shared/data/mock';

export function BookmarkScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categorySheetRef = useRef<BottomSheet>(null);

  const handleRecipePress = useCallback((recipe: RecipeCard) => {
    Alert.alert(recipe.title, 'Recipe Detail(네이티브)로 이동');
  }, []);

  const handleRecipeLongPress = useCallback((recipe: RecipeCard) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '수정', '삭제'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          title: recipe.title,
        },
        (index) => {
          if (index === 1) Alert.alert('수정', `${recipe.title} 수정`);
          if (index === 2) Alert.alert('삭제', `${recipe.title} 삭제`);
        },
      );
    } else {
      Alert.alert(recipe.title, '수정 또는 삭제', [
        { text: '취소', style: 'cancel' },
        { text: '수정', onPress: () => Alert.alert('수정') },
        { text: '삭제', style: 'destructive', onPress: () => Alert.alert('삭제') },
      ]);
    }
  }, []);

  const handleAddCategory = useCallback(() => {
    Alert.alert('카테고리 추가', '새 카테고리를 만듭니다');
  }, []);

  const handleCategoryManage = useCallback(() => {
    categorySheetRef.current?.expand();
  }, []);

  const handleDeleteCategory = useCallback((cat: Category) => {
    Alert.alert('삭제', `"${cat.name}" 카테고리를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive' },
    ]);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
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
        categories={MOCK_CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onAdd={handleAddCategory}
      />

      {/* 레시피 그리드 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
      >
        <RecipeGrid
          recipes={MOCK_MY_RECIPES}
          onPress={handleRecipePress}
          onLongPress={handleRecipeLongPress}
        />
      </ScrollView>

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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
              카테고리 관리
            </Text>
            <Pressable onPress={() => categorySheetRef.current?.close()}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {MOCK_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
            <View
              key={cat.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 16, color: colors.text.primary }}>{cat.name}</Text>
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
