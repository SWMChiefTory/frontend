import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCoupangSearch, type IngredientProduct } from '@/src/entities/affiliate';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { track, CoupangEvents } from '@/src/shared/analytics';

export interface IngredientPurchaseSheetRef {
  open: (ingredientNames: string[], recipeId?: string) => void;
  close: () => void;
}

export const IngredientPurchaseSheet = forwardRef<IngredientPurchaseSheetRef>(
  function IngredientPurchaseSheet(_, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [enabled, setEnabled] = useState(false);
    const recipeIdRef = useRef<string>('');
    const openedAtRef = useRef(0);
    const clickedProductsRef = useRef<string[]>([]);

    const { data: products = [], isLoading } = useCoupangSearch(ingredients, enabled);

    useImperativeHandle(ref, () => ({
      open: (names, recipeId) => {
        setIngredients(names);
        setEnabled(true);
        recipeIdRef.current = recipeId ?? '';
        openedAtRef.current = Date.now();
        clickedProductsRef.current = [];
        sheetRef.current?.present();
        track(CoupangEvents.PURCHASE_OPEN, {
          recipe_id: recipeId ?? '',
          ingredient_count: names.length,
        });
      },
      close: () => sheetRef.current?.dismiss(),
    }));

    const snapPoints = useMemo(() => ['72%'], []);

    const handleSheetChange = useCallback((index: number) => {
      // -1 = dismissed
      if (index === -1 && openedAtRef.current > 0) {
        track(CoupangEvents.PURCHASE_CLOSE, {
          recipe_id: recipeIdRef.current,
          products_displayed: products.length,
          products_clicked: clickedProductsRef.current.length,
          clicked_products: clickedProductsRef.current,
          duration_seconds: Math.round((Date.now() - openedAtRef.current) / 1000),
        });
        openedAtRef.current = 0;
      }
    }, [products.length]);

    const handleProductPress = useCallback((product: IngredientProduct, index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const productId = String(product.id);
      clickedProductsRef.current.push(productId);
      track(CoupangEvents.ITEM_CLICK, {
        recipe_id: recipeIdRef.current,
        ingredient_name: ingredients[0],
        product_id: productId,
        product_name: product.name,
        price: product.price,
        is_rocket: product.isRocket ?? false,
        position: index,
      });
      Linking.openURL(product.purchaseUrl).catch(() => {});
    }, [ingredients]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        stackBehavior="push"
        onChange={handleSheetChange}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
        )}
        backgroundStyle={{ backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {/* 헤더 */}
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 19,
                fontWeight: '700',
                color: colors.text.primary,
              }}
            >
              재료 한 번에 사기
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 11,
                color: colors.text.disabled,
                marginTop: 4,
              }}
            >
              이 페이지의 일부 링크는 쿠팡 파트너스 활동의 일환으로 수수료를 받습니다
            </Text>
          </View>

          {/* 컨텐츠 */}
          <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
            {isLoading ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : products.length === 0 ? (
              <View style={{ paddingVertical: 60, alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="cart-outline" size={48} color={colors.text.disabled} />
                <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.disabled }}>
                  검색 결과가 없어요
                </Text>
              </View>
            ) : (
              products.map((p, idx) => (
                <Pressable
                  key={p.id}
                  onPress={() => handleProductPress(p, idx)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surface : colors.background,
                  })}
                >
                  <View
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Image source={{ uri: p.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
                    {p.isRocket && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          backgroundColor: '#3B82F6',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>로켓</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View>
                      <Text
                        style={{
                          fontFamily: typography.heading.fontFamily,
                          fontSize: 15,
                          fontWeight: '700',
                          color: colors.text.primary,
                        }}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: 12,
                          color: colors.text.secondary,
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {p.description}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: typography.heading.fontFamily,
                        fontSize: 16,
                        fontWeight: '700',
                        color: colors.text.primary,
                      }}
                    >
                      {p.price.toLocaleString()}원
                    </Text>
                  </View>

                  <View style={{ justifyContent: 'center' }}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
