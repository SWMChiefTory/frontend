import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { typography, spacing, radius } from '@/src/shared/design/tokens';
import { getMoodImage } from './mood-images';

export interface MoodSelectorSheetRef {
  open: () => void;
  close: () => void;
}

interface MoodSelectorSheetProps {
  moods: string[];
  themeColor: string;
  themeTitle: string;
  onSelect: (mood: string | null) => void; // null = 전체 보기
}

export const MoodSelectorSheet = forwardRef<MoodSelectorSheetRef, MoodSelectorSheetProps>(
  function MoodSelectorSheet({ moods, themeColor, themeTitle, onSelect }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['80%'], []);

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
        backgroundStyle={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: '#D4D4D4', width: 40 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg }}
        >
          <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 22,
                fontWeight: '700',
                color: '#111',
                textAlign: 'center',
              }}
            >
              어떤 분위기로 즐겨볼까요?
            </Text>
          </View>

          {/* 2열 그리드 — 이미지 카드 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {moods.map((mood) => {
              const img = getMoodImage(mood);
              return (
                <Pressable
                  key={mood}
                  onPress={() => onSelect(mood)}
                  style={({ pressed }) => ({
                    width: '48%',
                    aspectRatio: 1,
                    borderRadius: radius.lg,
                    borderCurve: 'continuous',
                    backgroundColor: pressed ? themeColor : '#F5F5F7',
                    borderWidth: 1.5,
                    borderColor: pressed ? themeColor : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: spacing.md,
                    gap: 6,
                  })}
                >
                  {img ? (
                    <Image
                      source={img}
                      style={{ width: '70%', height: '70%' }}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={{ width: '70%', height: '70%' }} />
                  )}
                  <Text
                    style={{
                      fontFamily: typography.heading.fontFamily,
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#111',
                    }}
                    numberOfLines={1}
                  >
                    {mood}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => onSelect(null)} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 13,
                color: '#9CA3AF',
                textDecorationLine: 'underline',
              }}
            >
              전체 보기
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);
