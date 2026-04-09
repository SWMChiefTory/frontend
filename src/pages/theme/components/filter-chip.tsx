import { Pressable, Text } from 'react-native';
import { colors, radius, typography } from '@/src/shared/design/tokens';

type FilterChipProps = {
  label: string;
  active: boolean;
  isDark: boolean;
  themeColor: string;
  onPress: () => void;
}

export function FilterChip({ label, active, isDark, themeColor, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.full,
        backgroundColor: active
          ? themeColor
          : isDark
            ? colors.dark.surfaceElevated
            : colors.chip,
        borderCurve: 'continuous',
      }}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: 13,
          fontWeight: '600',
          color: active
            ? colors.dark.text.primary
            : isDark
              ? colors.dark.text.secondary
              : colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
