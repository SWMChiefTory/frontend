import { useLocalSearchParams } from 'expo-router';
import { RecipeDetailScreen } from '@/src/pages/recipe-detail/ui/recipe-detail-screen';

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetailScreen recipeId={id ?? ''} />;
}
