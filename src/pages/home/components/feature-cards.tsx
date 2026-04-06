import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';

const CARD_IMAGES = {
  create: require('@/assets/images/card-recipe-create.png'),
  fridge: require('@/assets/images/card-fridge.png'),
  calendar: require('@/assets/images/card-calendar.png'),
};

interface FeatureCard {
  id: keyof typeof CARD_IMAGES;
  title: string;
  subtitle: string;
  backgroundColor: string;
  locked: boolean;
}

const FEATURES: FeatureCard[] = [
  { id: 'create', title: '레시피', subtitle: '생성', backgroundColor: colors.card.recipe, locked: false },
  { id: 'fridge', title: '냉장고', subtitle: '파먹기', backgroundColor: colors.card.fridge, locked: true },
  { id: 'calendar', title: '캘린더', subtitle: '', backgroundColor: colors.card.calendar, locked: true },
];

interface FeatureCardsProps {
  onCreatePress: () => void;
  onLockedPress: (feature: string) => void;
}

export function FeatureCards({ onCreatePress, onLockedPress }: FeatureCardsProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.lg * 2 - spacing.md * 2) / 3;
  const cardHeight = cardWidth * 1.2;

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
            if (feature.locked) onLockedPress(feature.title);
            else onCreatePress();
          }}
          style={{
            flex: 1,
            height: cardHeight,
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderCurve: 'continuous',
          }}
        >
          {/* 배경 이미지 꽉 채움 */}
          <Image
            source={CARD_IMAGES[feature.id]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
          />

          {/* 하단 그라데이션 + 텍스트 */}
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              padding: spacing.sm,
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text
                style={{
                  fontFamily: typography.heading.fontFamily,
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.text.inverse,
                }}
              >
                {feature.title}
              </Text>
              {feature.locked && (
                <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.7)" />
              )}
            </View>
            {feature.subtitle ? (
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                {feature.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
