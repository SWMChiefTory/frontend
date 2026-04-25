import { useQuery } from '@tanstack/react-query';
import { fetchMyRecipes, fetchCategorizedRecipes, fetchCategories } from '../api/user-recipe-api';
import { useInfinitePagination } from '@/src/shared/hooks/use-infinite-pagination';

export function useMyRecipes() {
  return useInfinitePagination({
    queryKey: ['myRecipes'],
    queryFn: ({ pageParam }) => fetchMyRecipes(pageParam),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCategorizedRecipes(categoryId: string | null) {
  return useInfinitePagination({
    queryKey: ['categorizedRecipes', categoryId],
    queryFn: ({ pageParam }) => fetchCategorizedRecipes(categoryId!, pageParam),
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
