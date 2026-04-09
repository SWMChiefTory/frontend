import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, typography, radius } from '@/src/shared/design/tokens';
import type { ThemeData, ThemeCategory } from '@/src/entities/theme';
import { THEME_IMAGES } from './theme-images';
import { getCategoryImage } from './category-images';

type ThemeBannerProps = {
  theme: ThemeData;
  /** 카테고리가 선택된 상태면 히어로를 카테고리 컨셉으로 교체 */
  selectedCategory?: ThemeCategory | null;
  /** "바꾸기" 버튼 핸들러 (selectedCategory가 있을 때만 표시) */
  onChangeCategory?: () => void;
}

export function ThemeBanner({ theme, selectedCategory, onChangeCategory }: ThemeBannerProps) {
  const isDark = theme.mode === 'dark';
  const bg = isDark ? colors.dark.background : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : '#111';
  const bodyColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

  // ─── 카테고리 모드: 히어로 자체를 카테고리 컨셉으로 교체 ───
  if (selectedCategory) {
    const catImg = getCategoryImage(theme.id, selectedCategory.id);
    return (
      <View
        style={{
          backgroundColor: bg,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {catImg ? (
              <Image
                source={catImg}
                style={{ width: 56, height: 56 }}
                contentFit="contain"
              />
            ) : (
              <Text style={{ fontSize: 32 }}>{selectedCategory.emoji}</Text>
            )}
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                ...typography.heading.h1,
                color: titleColor,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {selectedCategory.name}
            </Text>
          </View>
          {onChangeCategory && (
            <Pressable
              onPress={onChangeCategory}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 12,
                  fontWeight: '600',
                  color: bodyColor,
                }}
              >
                바꾸기
              </Text>
            </Pressable>
          )}
        </View>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 17,
            color: bodyColor,
            lineHeight: 25,
            marginTop: spacing.sm,
          }}
        >
          {selectedCategory.concept}
        </Text>
      </View>
    );
  }

  // ─── 기본: 테마 메타 ───
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: spacing.sm, paddingTop: spacing.sm }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              ...typography.heading.h1,
              color: titleColor,
            }}
          >
            {theme.title}
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              ...typography.body.medium,
              color: bodyColor,
              lineHeight: 21,
            }}
          >
            {theme.subtitle}
          </Text>
        </View>
        {THEME_IMAGES[theme.id] && (
          <Image
            source={THEME_IMAGES[theme.id]}
            style={{ width: 80, height: 80 }}
            contentFit="contain"
          />
        )}
      </View>
    </View>
  );
}
