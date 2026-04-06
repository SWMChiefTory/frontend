import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';

const SLIDES = [
  {
    id: '1',
    image: require('@/assets/images/onboarding-tory.png'),
    title: '쉐프토리에 오신 걸 환영해요!',
    subtitle: '유튜브 요리 영상을 AI가 레시피로 만들어드려요',
    imageStyle: { width: 200, height: 200 },
  },
  {
    id: '2',
    image: require('@/assets/images/onboarding-home.png'),
    title: '레시피를 등록하세요',
    subtitle: '유튜브 URL만 붙여넣으면\n재료, 단계가 자동으로 정리돼요',
    imageStyle: { width: 180, height: 360 },
  },
  {
    id: '3',
    image: require('@/assets/images/onboarding-share1.png'),
    title: '유튜브에서 바로 공유하세요',
    subtitle: '요리 영상에서 공유 버튼을 누르고\n쉐프토리로 보내면 자동 등록돼요',
    imageStyle: { width: 180, height: 360 },
  },
  {
    id: '4',
    image: require('@/assets/images/onboarding-step.png'),
    title: '음성으로 요리해요',
    subtitle: '핸즈프리 모드에서\n"다음", "이전"만 말하면 단계가 넘어가요',
    imageStyle: { width: 180, height: 360 },
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isLast = currentIndex === SLIDES.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, isLast, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xxl,
              gap: spacing.xl,
            }}
          >
            <Image
              source={item.image}
              style={item.imageStyle}
              contentFit="contain"
            />
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 24,
                  fontWeight: '700',
                  color: colors.text.primary,
                  textAlign: 'center',
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 16,
                  color: colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 24,
                }}
              >
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      {/* 하단: 인디케이터 + 버튼 */}
      <View
        style={{
          paddingHorizontal: spacing.xxl,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.lg,
          alignItems: 'center',
        }}
      >
        {/* 페이지 인디케이터 */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === currentIndex ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>

        {/* 버튼 */}
        <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%', paddingHorizontal: spacing.xl }}>
          {!isLast && (
            <Pressable
              onPress={handleSkip}
              style={{
                flex: 1,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderCurve: 'continuous',
              }}
            >
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, fontWeight: '600', color: colors.text.secondary }}>
                건너뛰기
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            style={{
              flex: isLast ? undefined : 1,
              width: isLast ? '100%' : undefined,
              paddingVertical: spacing.lg,
              alignItems: 'center',
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {isLast ? '시작하기' : '다음'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
