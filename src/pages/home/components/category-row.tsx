import { ScrollView, Pressable, Text, Alert } from 'react-native';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';

const CATEGORIES = [
  { id: 'all', label: '전체', emoji: '🍽️' },
  { id: 'korean', label: '한식', emoji: '🇰🇷' },
  { id: 'western', label: '양식', emoji: '🍝' },
  { id: 'chinese', label: '중식', emoji: '🥟' },
  { id: 'japanese', label: '일식', emoji: '🍣' },
  { id: 'streetfood', label: '분식', emoji: '🍢' },
  { id: 'dessert', label: '디저트', emoji: '🍰' },
  { id: 'healthy', label: '건강식', emoji: '🥗' },
];

interface CategoryRowProps {
  onPress: (categoryId: string, label: string) => void;
}

export function CategoryRow({ onPress }: CategoryRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
      }}
    >
      {CATEGORIES.map((cat) => (
        <Pressable
          key={cat.id}
          onPress={() => onPress(cat.id, cat.label)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.full,
            backgroundColor: colors.surface,
            borderCurve: 'continuous',
          }}
        >
          <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              fontWeight: '500',
              color: colors.text.primary,
            }}
          >
            {cat.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
