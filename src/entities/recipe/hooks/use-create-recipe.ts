import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createRecipe, fetchRecipeProgress, RecipeStatus } from '../api/recipe-create-api';

export function useCreateRecipe(options?: {
  onSuccess?: (recipeId: string) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: createRecipe,
    onSuccess: (recipeId) => options?.onSuccess?.(recipeId),
    onError: (err: Error) => options?.onError?.(err),
  });
}

/**
 * 레시피 생성 진행 상태 폴링
 * - IN_PROGRESS면 1초마다 refetch
 * - SUCCESS/FAILED/BLOCKED/BANNED면 폴링 중단
 * - SUCCESS 시 myRecipes 캐시 invalidate
 */
export function useRecipeProgress(recipeId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recipeProgress', recipeId],
    queryFn: () => fetchRecipeProgress(recipeId!),
    enabled: !!recipeId,
    refetchInterval: (q) => {
      const status = q.state.data;
      if (status === RecipeStatus.IN_PROGRESS) return 1000;
      return false;
    },
  });

  useEffect(() => {
    if (query.data === RecipeStatus.SUCCESS) {
      queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['categorizedRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['recommendRecipes'] });
    }
  }, [query.data, queryClient]);

  return query;
}
