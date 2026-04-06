import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/src/shared/design/tokens';

interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
  icon: string;
  locked: boolean;
}

const FEATURES: FeatureCard[] = [
  { id: 'create', title: '레시피', subtitle: '생성', backgroundColor: colors.card.recipe, icon: '📖', locked: false },
  { id: 'fridge', title: '냉장고', subtitle: '파먹기', backgroundColor: colors.card.fridge, icon: '🧊', locked: true },
  { id: 'calendar', title: '캘린더', subtitle: '', backgroundColor: colors.card.calendar, icon: '📅', locked: true },
];

interface FeatureCardsProps {
  onCreatePress: () => void;
  onLockedPress: (feature: string) => void;
}

export function FeatureCards({ onCreatePress, onLockedPress }: FeatureCardsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        paddingVertical: spacing.sm,
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
            width: 120,
            height: 140,
            backgroundColor: feature.backgroundColor,
            borderRadius: radius.lg,
            padding: spacing.md,
            justifyContent: 'space-between',
            borderCurve: 'continuous',
          }}
        >
          <Text style={{ fontSize: 28 }}>{feature.icon}</Text>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.inverse }}>
                {feature.title}
              </Text>
              {feature.locked && (
                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
              )}
            </View>
            {feature.subtitle ? (
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                {feature.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
