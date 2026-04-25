import { useEffect } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/entities/theme';
import { colors, typography } from '@/src/shared/design/tokens';
import { MOCK_THEME_CARDS } from '@/src/shared/data/mock';
import { ThemeDetailScreen } from '@/src/pages/theme/ui/theme-detail-screen';
import { track, ThemeEvents } from '@/src/shared/analytics';

export default function ThemeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: theme, isLoading } = useTheme(id);

  useEffect(() => {
    if (id) track(ThemeEvents.VIEW, { theme_id: String(id) });
  }, [id]);

  // 헤더 색상은 로컬 mock에서 즉시 결정 (fetch 대기 없이)
  const card = MOCK_THEME_CARDS.find((c) => c.id === id);
  const headerColor = theme?.color ?? card?.backgroundColor ?? '#8B7355';
  const headerTitle = card?.title ?? '추천 요리';

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          animation: 'slide_from_right',
          headerStyle: { backgroundColor: headerColor },
          headerTintColor: colors.text.inverse,
          headerTitleStyle: {
            color: colors.text.inverse,
            fontFamily: typography.heading.fontFamily,
            fontSize: 18,
            fontWeight: '700',
          },
          headerShadowVisible: false,
          // 명시적 back button — 시트 backdrop 등 다른 요소 영향 안 받게
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              hitSlop={16}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text.inverse} />
            </Pressable>
          ),
        }}
      />
      {isLoading || !theme ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ThemeDetailScreen theme={theme} />
      )}
    </View>
  );
}
