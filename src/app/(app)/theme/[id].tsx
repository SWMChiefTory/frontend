import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
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
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: headerColor },
          headerTintColor: colors.text.inverse,
          headerTitleStyle: {
            color: colors.text.inverse,
            fontFamily: typography.heading.fontFamily,
            fontSize: 18,
            fontWeight: '700',
          },
          headerShadowVisible: false,
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
