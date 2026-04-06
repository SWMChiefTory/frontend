import { useQuery } from '@tanstack/react-query';
import { fetchRecipeDetail } from '../api/recipe-detail-api';

export function useRecipeDetail(id: string) {
  return useQuery({
    queryKey: ['recipeDetail', id],
    queryFn: () => fetchRecipeDetail(id),
    enabled: !!id,
  });
}
