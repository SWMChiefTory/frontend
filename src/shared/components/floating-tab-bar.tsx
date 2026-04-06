import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { radius, spacing } from '@/src/shared/design/tokens';

interface Tab {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'home', icon: 'home-variant-outline', iconActive: 'home-variant' },
  { key: 'bookmark', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

const INDICATOR_SIZE = 44;
const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };

interface FloatingTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function FloatingTabBar({ activeTab, onTabPress }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width * 0.55, 240);
  const innerPadding = spacing.xl;
  const tabAreaWidth = tabBarWidth - innerPadding * 2;
  const tabWidth = tabAreaWidth / TABS.length;

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const translateX = useSharedValue(activeIndex * tabWidth + (tabWidth - INDICATOR_SIZE) / 2);

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    translateX.value = withSpring(
      idx * tabWidth + (tabWidth - INDICATOR_SIZE) / 2,
      SPRING_CONFIG,
    );
  }, [activeTab, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
          width: tabBarWidth,
          borderRadius: radius.full,
          overflow: 'hidden',
          borderCurve: 'continuous',
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: spacing.md,
            paddingHorizontal: innerPadding,
          }}
        >
          {/* 슬라이딩 인디케이터 */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: spacing.md + spacing.xs,
                left: innerPadding,
                width: INDICATOR_SIZE,
                height: INDICATOR_SIZE,
                borderRadius: INDICATOR_SIZE / 2,
                backgroundColor: '#F3F4F6',
                borderCurve: 'continuous',
              },
              indicatorStyle,
            ]}
          />

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
                  height: INDICATOR_SIZE,
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
    </View>
  );
}
