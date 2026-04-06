import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { FloatingTabBar } from '@/src/shared/components/floating-tab-bar';
import { HomeScreen } from '@/src/pages/home/ui/home-screen';
import { BookmarkScreen } from '@/src/pages/bookmark/ui/bookmark-screen';

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {activeTab === 'home' && <HomeScreen />}
      {activeTab === 'bookmark' && <BookmarkScreen />}

      <FloatingTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}
