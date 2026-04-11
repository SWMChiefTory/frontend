import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useMarketStore } from '@/src/shared/store/marketStore';

const CARD_IMAGES = {
  create: require('@/assets/images/card-recipe-create.png'),
  fridge: require('@/assets/images/card-fridge.png'),
  calendar: require('@/assets/images/card-calendar.png'),
};

type FeatureCard = {
  id: keyof typeof CARD_IMAGES;
  titleKey: 'createTitle' | 'fridgeTitle' | 'calendarTitle';
  subtitleKey: 'createSubtitle' | 'fridgeSubtitle' | 'calendarSubtitle';
  backgroundColor: string;
  locked: boolean;
}

const FEATURES: FeatureCard[] = [
  { id: 'create', titleKey: 'createTitle', subtitleKey: 'createSubtitle', backgroundColor: colors.card.recipe, locked: false },
  { id: 'fridge', titleKey: 'fridgeTitle', subtitleKey: 'fridgeSubtitle', backgroundColor: colors.card.fridge, locked: true },
  { id: 'calendar', titleKey: 'calendarTitle', subtitleKey: 'calendarSubtitle', backgroundColor: colors.card.calendar, locked: true },
];

type FeatureCardsProps = {
  onCreatePress: () => void;
  onLockedPress: (feature: string) => void;
}

export function FeatureCards({ onCreatePress, onLockedPress }: FeatureCardsProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.lg * 2 - spacing.md * 2) / 3;
  const cardHeight = cardWidth * 1.2;
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
      }}
    >
      {FEATURES.map((feature) => (
        <Pressable
          key={feature.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (feature.locked) onLockedPress(t[feature.titleKey]);
            else onCreatePress();
          }}
          style={{
            flex: 1,
            height: cardHeight,
            backgroundColor: feature.backgroundColor,
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderCurve: 'continuous',
          }}
        >
          {/* 이미지 */}
          <Image
            source={CARD_IMAGES[feature.id]}
            style={{
              flex: 1,
              marginTop: spacing.sm,
              marginHorizontal: spacing.xs,
            }}
            contentFit="contain"
          />

          {/* 하단 텍스트 */}
          <View style={{ padding: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text.inverse,
                }}
              >
                {t[feature.titleKey]}
              </Text>
            </View>
            {t[feature.subtitleKey] ? (
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {t[feature.subtitleKey]}
              </Text>
            ) : null}
          </View>

          {/* 잠금 오버레이 */}
          {feature.locked && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.lg,
                gap: spacing.xs,
              }}
            >
              <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.9)" />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 11,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {t.comingSoon}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const TEXTS = {
  KOREA: {
    createTitle: '레시피',
    createSubtitle: '생성',
    fridgeTitle: '냉장고',
    fridgeSubtitle: '파먹기',
    calendarTitle: '캘린더',
    calendarSubtitle: '',
    comingSoon: '곧 만나요!',
  },
  GLOBAL: {
    createTitle: 'Recipe',
    createSubtitle: 'Create',
    fridgeTitle: 'Fridge',
    fridgeSubtitle: 'Use up',
    calendarTitle: 'Calendar',
    calendarSubtitle: '',
    comingSoon: 'Coming soon!',
  },
} as const;
