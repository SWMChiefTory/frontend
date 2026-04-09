import { useQuery } from '@tanstack/react-query';
import { fetchMyRecipes, fetchCategorizedRecipes, fetchCategories } from '../api/user-recipe-api';

export function useMyRecipes() {
  return useQuery({
    queryKey: ['myRecipes'],
    queryFn: () => fetchMyRecipes(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCategorizedRecipes(categoryId: string | null) {
  return useQuery({
    queryKey: ['categorizedRecipes', categoryId],
    queryFn: () => fetchCategorizedRecipes(categoryId!),
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
}
