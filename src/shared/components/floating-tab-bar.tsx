import { Pressable, View, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing } from '@/src/shared/design/tokens';

interface Tab {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'home', icon: 'home-variant-outline', iconActive: 'home-variant' },
  { key: 'bookmark', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

interface FloatingTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function FloatingTabBar({ activeTab, onTabPress }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width * 0.55, 240);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 16) + 8,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={60}
        tint="systemChromeMaterial"
        style={{
          width: tabBarWidth,
          borderRadius: radius.full,
          overflow: 'hidden',
          borderCurve: 'continuous',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onTabPress(tab.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 2,
                  paddingVertical: spacing.xs,
                }}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? '#1F2937' : '#C0C0C0'}
                />
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
