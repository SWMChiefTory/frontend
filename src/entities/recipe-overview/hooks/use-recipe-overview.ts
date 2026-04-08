import { useQuery } from '@tanstack/react-query';
import { fetchRecipeOverview } from '../api/recipe-overview-api';

export function useRecipeOverview(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipeOverview', recipeId],
    queryFn: () => fetchRecipeOverview(recipeId!),
    enabled: !!recipeId,
    staleTime: 10 * 60 * 1000, // 10분 — 큐레이션은 자주 안 바뀜
  });
}
