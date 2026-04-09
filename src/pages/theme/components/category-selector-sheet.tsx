import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { typography, spacing, radius } from '@/src/shared/design/tokens';
import type { ThemeCategory } from '@/src/entities/theme';
import { getCategoryImage } from './category-images';

export type CategorySelectorSheetRef = {
  open: () => void;
  close: () => void;
}

type CategorySelectorSheetProps = {
  themeId: string;
  categories: ThemeCategory[];
  themeColor: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void; // null = 전체 보기
}

export const CategorySelectorSheet = forwardRef<
  CategorySelectorSheetRef,
  CategorySelectorSheetProps
>(function CategorySelectorSheet(
  { themeId, categories, themeColor, selectedId, onSelect },
  ref,
) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="none"
        />
      )}
      backgroundStyle={{
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{ backgroundColor: '#D4D4D4', width: 40 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={{ alignItems: 'center', marginTop: spacing.sm, gap: 6 }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 22,
              fontWeight: '700',
              color: '#111',
              textAlign: 'center',
            }}
          >
            오늘은 누구의 한 끼예요?
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              color: '#9CA3AF',
              textAlign: 'center',
            }}
          >
            토리가 딱 맞는 요리 골라줄게요
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          {categories.map((cat) => {
            const isSelected = cat.id === selectedId;
            const img = getCategoryImage(themeId, cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => onSelect(cat.id)}
                style={({ pressed }) => ({
                  width: '48%',
                  aspectRatio: 1,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  backgroundColor: isSelected || pressed ? themeColor : '#F5F5F7',
                  borderWidth: 1.5,
                  borderColor: isSelected ? themeColor : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: spacing.md,
                  paddingBottom: spacing.md,
                  gap: 6,
                  overflow: 'hidden',
                })}
              >
                {img ? (
                  <Image
                    source={img}
                    style={{ width: '70%', height: '70%' }}
                    contentFit="contain"
                  />
                ) : (
                  <Text style={{ fontSize: 44 }}>{cat.emoji}</Text>
                )}
                <Text
                  style={{
                    fontFamily: typography.heading.fontFamily,
                    fontSize: 15,
                    fontWeight: '700',
                    color: isSelected ? '#fff' : '#111',
                  }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => onSelect(null)}
          style={{ alignItems: 'center', paddingVertical: spacing.sm }}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              color: '#9CA3AF',
              textDecorationLine: 'underline',
            }}
          >
            토리한테 다 맡길래요
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});
