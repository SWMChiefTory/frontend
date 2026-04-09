import { useQuery } from '@tanstack/react-query';
import { fetchRecommendRecipes, RecommendType } from '../api/recommend-api';

export function useRecommendRecipes(type: RecommendType) {
  return useQuery({
    queryKey: ['recommendRecipes', type],
    queryFn: () => fetchRecommendRecipes(type),
    staleTime: 5 * 60 * 1000,
  });
}
