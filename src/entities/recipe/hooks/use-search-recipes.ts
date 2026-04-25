import { searchRecipes } from '../api/search-api';
import { useInfinitePagination } from '@/src/shared/hooks/use-infinite-pagination';

export function useSearchRecipes(query: string) {
  return useInfinitePagination({
    queryKey: ['searchRecipes', query],
    queryFn: ({ pageParam }) => searchRecipes(query, pageParam),
    enabled: query.trim().length > 0,
  });
}
