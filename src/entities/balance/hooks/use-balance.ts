import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBalance, completeRecharge } from '../api/balance-api';

export const BALANCE_QUERY_KEY = ['balance'];

export function useBalance() {
  return useQuery({
    queryKey: BALANCE_QUERY_KEY,
    queryFn: fetchBalance,
    staleTime: 60 * 1000,
  });
}

export function useRechargeBalance(options?: {
  onSuccess?: (data: { amount: number; remainingCount: number }) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeRecharge,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEY });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}
