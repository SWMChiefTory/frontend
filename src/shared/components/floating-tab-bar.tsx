import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius, spacing } from '@/src/shared/design/tokens';

type Tab = {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'home', icon: 'home-variant-outline', iconActive: 'home-variant' },
  { key: 'bookmark', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

type FloatingTabBarProps = {
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
      <View
        style={{
          flexDirection: 'row',
          width: tabBarWidth,
          backgroundColor: '#FFFFFF',
          borderRadius: radius.full,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderCurve: 'continuous',
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
                justifyContent: 'center',
                paddingVertical: spacing.xs,
              }}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={26}
                color={isActive ? '#1F2937' : '#B0B0B0'}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
