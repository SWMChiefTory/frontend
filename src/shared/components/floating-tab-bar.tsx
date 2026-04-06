import { Pressable, View, Text, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing } from '@/src/shared/design/tokens';

interface Tab {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'home', label: '홈', icon: 'home-outline', iconActive: 'home' },
  { key: 'bookmark', label: '북마크', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

interface FloatingTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function FloatingTabBar({ activeTab, onTabPress }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width * 0.55, 240);
  const isIOS = Platform.OS === 'ios';

  const tabContent = (
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
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={22}
              color={isActive ? colors.tab.active : colors.tab.inactive}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? colors.tab.active : colors.tab.inactive,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

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
      {isIOS ? (
        <BlurView
          intensity={80}
          tint="systemChromeMaterial"
          style={{
            width: tabBarWidth,
            borderRadius: radius.full,
            overflow: 'hidden',
            borderCurve: 'continuous',
          }}
        >
          {tabContent}
        </BlurView>
      ) : (
        <View
          style={{
            width: tabBarWidth,
            backgroundColor: '#FFFFFF',
            borderRadius: radius.full,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          }}
        >
          {tabContent}
        </View>
      )}
    </View>
  );
}
