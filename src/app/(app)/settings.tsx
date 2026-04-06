import { View } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { findAccessToken, findRefreshToken } from '@/src/modules/shared/storage/SecureStorage';

const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL ?? 'https://app.cheftories.com';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [tokenScript, setTokenScript] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const accessToken = await findAccessToken();
      const refreshToken = await findRefreshToken();
      const script = `
        (function() {
          try {
            localStorage.setItem('MAIN_ACCESS_TOKEN', '${accessToken ?? ''}');
            localStorage.setItem('MAIN_REFRESH_TOKEN', '${refreshToken ?? ''}');
          } catch(e) {}
          true;
        })();
      `;
      setTokenScript(script);
    })();
  }, []);

  if (!tokenScript) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <WebView
          source={{ uri: `${WEBVIEW_URL}/user/settings` }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          injectedJavaScriptBeforeContentLoaded={tokenScript}
        />
      </View>
    </View>
  );
}
