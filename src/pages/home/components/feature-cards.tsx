import { View, Text, Pressable, useWindowDimensions } from 'react-native';
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
                {feature.title}
              </Text>
            </View>
            {feature.subtitle ? (
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {feature.subtitle}
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
                곧 만나요!
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
