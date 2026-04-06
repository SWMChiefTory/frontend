import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FloatingTabBar } from '@/src/shared/components/floating-tab-bar';
import { HomeScreen } from '@/src/pages/home/ui/home-screen';
import { BookmarkScreen } from '@/src/pages/bookmark/ui/bookmark-screen';
import { RecipeCreateSheet, type RecipeCreateSheetRef } from '@/src/pages/home/components/recipe-create-sheet';

const ONBOARDING_KEY = 'onboarding_completed';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const createSheetRef = useRef<RecipeCreateSheetRef>(null);

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

      {activeTab === 'home' && <HomeScreen onCreatePress={() => createSheetRef.current?.open()} />}
      {activeTab === 'bookmark' && <BookmarkScreen />}

      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      <RecipeCreateSheet ref={createSheetRef} />
    </View>
  );
}
