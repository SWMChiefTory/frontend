import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { FloatingTabBar } from '@/src/shared/components/floating-tab-bar';
import { HomeScreen } from '@/src/pages/home/ui/home-screen';
import { BookmarkScreen } from '@/src/pages/bookmark/ui/bookmark-screen';
import { RecipeCreateSheet, type RecipeCreateSheetRef } from '@/src/pages/home/components/recipe-create-sheet';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const createSheetRef = useRef<RecipeCreateSheetRef>(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {activeTab === 'home' && <HomeScreen onCreatePress={() => createSheetRef.current?.open()} />}
      {activeTab === 'bookmark' && <BookmarkScreen />}

      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />

      {/* 바텀시트 — 최상위에 위치하여 헤더/탭바 위에 표시 */}
      <RecipeCreateSheet ref={createSheetRef} />
    </View>
  );
}
