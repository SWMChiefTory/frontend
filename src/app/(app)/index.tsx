import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FloatingTabBar } from '@/src/shared/components/floating-tab-bar';
import { HomeScreen } from '@/src/pages/home/ui/home-screen';
import { BookmarkScreen } from '@/src/pages/bookmark/ui/bookmark-screen';
import { ShareDeepLinkHandler } from '@/src/shared/components/deep-link-handler';

const ONBOARDING_KEY = 'onboarding_completed';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('home');

  // 온보딩 체크
  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {activeTab === 'home' && <HomeScreen />}
      {activeTab === 'bookmark' && <BookmarkScreen />}

      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      <ShareDeepLinkHandler />
    </View>
  );
}
