import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Linking, Alert } from 'react-native';
import { useEffect } from 'react';
import * as ExpoLinking from 'expo-linking';
import { useRecipeCreateStore } from '@/src/pages/home/model/recipe-create-store';

function useVoiceDeepLink() {
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('type=TORY_ALARM_ON')) {
        Alert.alert('토리', '알람 켜 (Intent 딥링크)');
      }
    });
    return () => sub.remove();
  }, []);
}

/**
 * 공유하기 딥링크 처리.
 * - cold start: Linking.getInitialURL() (앱 종료 상태에서 공유)
 * - warm/background: Linking.addEventListener('url')
 */
function useShareDeepLink() {
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      if (
        url.includes('expo-development-client') ||
        url.includes('com.googleusercontent.apps')
      ) return;

      const parsed = ExpoLinking.parse(url);
      const videoId = parsed.queryParams?.['video-id'];
      if (typeof videoId === 'string' && videoId.length > 0) {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        useRecipeCreateStore.getState().requestOpen(videoUrl);
      }
    };

    // 1. cold start: 앱이 종료된 상태에서 공유로 켜짐
    Linking.getInitialURL().then(handle);

    // 2. warm/background: 앱이 실행 중일 때
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);
}

export default function AppLayout() {
  useVoiceDeepLink();
  useShareDeepLink();

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="search"
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="theme/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="withdrawal"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="native-step/[id]"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="legal/privacy-policy"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="legal/terms-of-service"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </KeyboardProvider>
  );
}
