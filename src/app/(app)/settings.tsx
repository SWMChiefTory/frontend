import { View } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL ?? 'https://app.cheftories.com';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <WebView
          source={{ uri: `${WEBVIEW_URL}/user/settings` }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </View>
  );
}
