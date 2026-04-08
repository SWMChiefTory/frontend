import { useQuery } from '@tanstack/react-query';
import { fetchThemeById } from '../api/theme-api';

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['theme', id],
    queryFn: () => fetchThemeById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
