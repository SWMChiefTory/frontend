import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Linking, Alert } from 'react-native';
import { useEffect } from 'react';

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

export default function AppLayout() {
  useVoiceDeepLink();

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="native-step/[id]"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
      </Stack>
    </KeyboardProvider>
  );
}
