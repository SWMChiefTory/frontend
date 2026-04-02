import { Suspense } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RecipeStepScreen } from '@/src/pages/native-step/ui/RecipeStepScreen';
import { useRecipe } from '@/src/entities/recipe';

function StepContent({ recipeId }: { recipeId: string }) {
  const { data } = useRecipe(recipeId);
  return <RecipeStepScreen videoId={data.videoId} recipe={data.recipe} />;
}

function StepFallback() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#f97316" />
      <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 }}>
        레시피 불러오는 중...
      </Text>
    </View>
  );
}

export default function RecipeStepPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Suspense fallback={<StepFallback />}>
        <StepContent recipeId={id ?? ''} />
      </Suspense>
    </>
  );
}
