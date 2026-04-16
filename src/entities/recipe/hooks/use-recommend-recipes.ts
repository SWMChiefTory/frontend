import { fetchRecommendRecipes, RecommendType } from '../api/recommend-api';
import { useInfinitePagination } from '@/src/shared/hooks/use-infinite-pagination';

export function useRecommendRecipes(type: RecommendType) {
  return useInfinitePagination({
    queryKey: ['recommendRecipes', type],
    queryFn: ({ pageParam }) => fetchRecommendRecipes(type, pageParam),
    staleTime: 5 * 60 * 1000,
  });
}
