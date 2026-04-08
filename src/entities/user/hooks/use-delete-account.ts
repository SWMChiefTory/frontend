import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAccount } from '../api/auth-api';
import { useUserStore } from '../store/user-store';
import { findRefreshToken, clearTokens, useAuthStore } from '@/src/shared/api';
import { unregisterExpoPushOnLogout } from '@/src/modules/notifications/expo-push';

interface UseDeleteAccountOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteAccount(options?: UseDeleteAccountOptions) {
  const removeUser = useUserStore((s) => s.removeUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const rt = await findRefreshToken();
      if (rt) await deleteAccount(rt);
    },
    onSuccess: async () => {
      // 핵심 상태 정리
      await clearTokens();
      removeUser();
      clearAuth();
      queryClient.clear();

      // 부수 효과
      try {
        await unregisterExpoPushOnLogout();
      } catch (err) {
        console.warn('[useDeleteAccount] push unregister error:', err);
      }

      // UI 책임
      options?.onSuccess?.();
    },
    onError: (err) => options?.onError?.(err as Error),
  });
}
