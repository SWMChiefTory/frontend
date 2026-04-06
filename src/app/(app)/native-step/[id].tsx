import { Suspense } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { RecipeStepScreen } from '@/src/pages/native-step/ui/RecipeStepScreen';
import { useRecipe } from '@/src/entities/recipe';
import { ErrorBoundary } from 'react-error-boundary';

function StepContent({ recipeId }: { recipeId: string }) {
  const { data } = useRecipe(recipeId);
  console.log(`[NativeStep] data keys:`, Object.keys(data));
  console.log(`[NativeStep] videoId:`, data.videoId);
  console.log(`[NativeStep] recipe:`, data.recipe ? Object.keys(data.recipe) : 'undefined');

  if (!data.recipe) {
    throw new Error('레시피 데이터 구조 오류: recipe 필드가 없습니다');
  }

  return <RecipeStepScreen videoId={data.videoId} recipe={data.recipe} isShorts={data.videoType === 'SHORTS'} />;
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

function StepError({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
        레시피를 불러올 수 없어요
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 }}>
        {error.message}
      </Text>
      <Pressable
        onPress={() => router.back()}
        style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#f97316', borderRadius: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>돌아가기</Text>
      </Pressable>
    </View>
  );
}

export default function RecipeStepPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorBoundary FallbackComponent={StepError}>
        <Suspense fallback={<StepFallback />}>
          <StepContent recipeId={id ?? ''} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
