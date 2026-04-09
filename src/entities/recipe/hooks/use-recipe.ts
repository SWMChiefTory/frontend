import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchRecipeById } from '../api/recipe-api';
import type { RecipeEntry } from '../api/types';

export function useRecipe(recipeId: string) {
  return useSuspenseQuery<RecipeEntry>({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipeById(recipeId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
