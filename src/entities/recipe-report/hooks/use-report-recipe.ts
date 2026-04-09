import { useMutation } from '@tanstack/react-query';
import { reportRecipe, type RecipeReportRequest } from '../api/recipe-report-api';

export function useReportRecipe() {
  return useMutation({
    mutationFn: ({ recipeId, body }: { recipeId: string; body: RecipeReportRequest }) =>
      reportRecipe(recipeId, body),
  });
}
