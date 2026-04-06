import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '@/src/shared/design/tokens';
import { MOCK_BERRY_BALANCE } from '@/src/shared/data/mock';

const BERRY_ICON = require('@/assets/images/berry-icon.png');

interface HomeHeaderProps {
  onBerryPress: () => void;
  onSearchPress: () => void;
  onSettingsPress: () => void;
}

export function HomeHeader({ onBerryPress, onSearchPress, onSettingsPress }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      {/* 1행: 베리 + 설정 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <Pressable
          onPress={onBerryPress}
          style={{ alignItems: 'center', width: 36 }}
          hitSlop={8}
        >
          <Image
            source={BERRY_ICON}
            style={{ width: 24, height: 24 }}
            contentFit="contain"
          />
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              backgroundColor: colors.background,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: radius.full,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text.primary }}>
              {MOCK_BERRY_BALANCE}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={onSettingsPress} hitSlop={8}>
          <Ionicons name="settings-outline" size={24} color={colors.text.secondary} />
        </Pressable>
      </View>

      {/* 2행: 검색바 */}
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg }}>
        <Pressable
          onPress={onSearchPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.background,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.text.disabled} />
          <Text style={{ fontSize: 14, color: colors.text.disabled }}>
            레시피를 검색하세요
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
