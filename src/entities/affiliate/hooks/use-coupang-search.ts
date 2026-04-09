import { useQuery } from '@tanstack/react-query';
import { searchCoupangIngredients } from '../api/affiliate-api';

export function useCoupangSearch(ingredientNames: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['coupangIngredients', ingredientNames],
    queryFn: () => searchCoupangIngredients(ingredientNames),
    enabled: enabled && ingredientNames.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}
