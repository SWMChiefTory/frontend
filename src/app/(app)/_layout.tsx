import { View } from 'react-native';
import { Stack } from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { RecipeCreateSheet } from '@/src/pages/home/components/recipe-create-sheet';

export default function AppLayout() {

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1 }}>
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
      <RecipeCreateSheet />
      </View>
    </KeyboardProvider>
  );
}
