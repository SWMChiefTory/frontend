import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/src/shared/design/tokens';
interface CategoryChipsProps {
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function CategoryChips({ categories, selected, onSelect, onAdd }: CategoryChipsProps) {
  return (
    <View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        alignItems: 'center',
      }}
    >
      {/* 추가 칩 — 맨 앞 */}
      <Pressable
        onPress={onAdd}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderCurve: 'continuous',
        }}
      >
        <Ionicons name="add" size={16} color={colors.text.secondary} />
        <Text style={{ fontSize: 16, color: colors.text.secondary }}>추가</Text>
      </Pressable>

      {categories.map((cat) => {
        const isSelected = cat.id === selected;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.full,
              backgroundColor: isSelected ? colors.primary : 'transparent',
              borderWidth: isSelected ? 0 : 1,
              borderColor: colors.border,
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: isSelected ? '600' : '400',
                color: isSelected ? colors.text.inverse : colors.text.primary,
              }}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
    </View>
  );
}
