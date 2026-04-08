import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FloatingTabBar } from '@/src/shared/components/floating-tab-bar';
import { HomeScreen } from '@/src/pages/home/ui/home-screen';
import { BookmarkScreen } from '@/src/pages/bookmark/ui/bookmark-screen';
import { RecipeCreateSheet, type RecipeCreateSheetRef } from '@/src/pages/home/components/recipe-create-sheet';
import { useRecipeCreateStore } from '@/src/pages/home/model/recipe-create-store';

const ONBOARDING_KEY = 'onboarding_completed';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const createSheetRef = useRef<RecipeCreateSheetRef>(null);
  const pendingVideoUrl = useRecipeCreateStore((s) => s.pendingVideoUrl);
  const consumePending = useRecipeCreateStore((s) => s.consume);

  // 온보딩 체크
  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        router.replace('/onboarding');
      }
    })();
  }, []);

  // 딥링크로 받은 유튜브 URL → 레시피 생성 시트 자동 오픈
  useEffect(() => {
    if (pendingVideoUrl !== null) {
      // 작은 딜레이로 화면 마운트 후 열기
      const timer = setTimeout(() => {
        createSheetRef.current?.open(pendingVideoUrl);
        consumePending();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingVideoUrl, consumePending]);

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
