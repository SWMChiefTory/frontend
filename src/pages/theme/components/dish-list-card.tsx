import { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, typography } from '@/src/shared/design/tokens';
import { type ThemeDish, youtubeThumbnailUrl } from '@/src/entities/theme';
import { track, ThemeEvents } from '@/src/shared/analytics';

type DishListCardProps = {
  dish: ThemeDish;
  isDark: boolean;
  themeId?: string;
  themeColor?: string;
}

export function DishListCard({ dish, isDark, themeId, themeColor }: DishListCardProps) {
  const handlePress = useCallback(() => {
    track(ThemeEvents.DISH_CLICK, {
      theme_id: themeId ?? '',
      dish_name: dish.title,
    });
    if (dish.recipe_id) {
      router.push(`/recipe/${dish.recipe_id}`);
      return;
    }
    // eslint-disable-next-line no-console
    console.warn('[DishListCard] recipe_id 없음:', dish.id, dish.title);
  }, [dish.id, dish.title, dish.recipe_id, themeId]);

  const thumbnailUrl = youtubeThumbnailUrl(dish.video_id, 'maxres');
  const moodLabel = dish.tags.mood[0];

  const cardBg = isDark ? 'transparent' : '#FFFFFF';
  const titleColor = isDark ? colors.dark.text.primary : colors.text.primary;
  const subColor = isDark ? colors.dark.text.muted : colors.text.disabled;
  const metaColor = isDark ? colors.dark.text.secondary : colors.text.secondary;
  const arrowBg = themeColor ?? colors.primary;
  // hook은 진한 핑크색 — 가독성 + 사랑 한 끼 톤
  const hookColor = isDark ? '#FF7AB6' : '#D6336C';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        backgroundColor: cardBg,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        boxShadow: isDark
          ? 'none'
          : '0px 2px 10px rgba(0,0,0,0.07)',
        opacity: pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      {/* ─── Hero 이미지 (16:9, 컴팩트) ─── */}
      <View style={{ aspectRatio: 16 / 9, backgroundColor: '#000' }}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={250}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' }}
          pointerEvents="none"
        />

        {/* 짧은 요리명 오버레이 (좌상단) */}
        {dish.dish_name ? (
          <View
            style={{
              position: 'absolute',
              left: 14,
              top: 14,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.full,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          >
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                color: '#fff',
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
            >
              {dish.dish_name}
            </Text>
          </View>
        ) : null}

        {dish.estimated_duration ? (
          <View
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: radius.full,
              backgroundColor: 'rgba(0,0,0,0.65)',
            }}
          >
            <Ionicons name="play" size={10} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
              {dish.estimated_duration}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ─── 본문 (컴팩트) ─── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingLeft: 16,
          paddingRight: 12,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          {dish.hook ? (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 13,
                fontStyle: 'italic',
                color: hookColor,
                fontWeight: '700',
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              “{dish.hook}”
            </Text>
          ) : null}

          {dish.why_recommended ? (
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 11,
                color: subColor,
                lineHeight: 15,
              }}
              numberOfLines={1}
            >
              {dish.why_recommended}
            </Text>
          ) : null}

          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 15,
              fontWeight: '700',
              color: titleColor,
              lineHeight: 20,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {dish.title}
          </Text>

          {/* 메타: 채널 · 난이도 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <Text
              style={{ fontFamily: typography.body.fontFamily, fontSize: 11, color: subColor }}
              numberOfLines={1}
            >
              {dish.channel}
            </Text>
            <Text style={{ color: subColor, fontSize: 11 }}>·</Text>
            <Text
              style={{ fontFamily: typography.body.fontFamily, fontSize: 11, fontWeight: '600', color: metaColor }}
            >
              {dish.tags.difficulty}
            </Text>
          </View>
        </View>

        {/* 우측 화살표 버튼 */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: arrowBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}
