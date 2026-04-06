import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from '@/src/pages/onboarding/ui/onboarding-screen';

const ONBOARDING_KEY = 'onboarding_completed';

export default function OnboardingRoute() {
  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <OnboardingScreen onComplete={handleComplete} />
    </>
  );
}
