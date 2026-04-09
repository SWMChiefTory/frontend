import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../api/auth-api';
import { useUserStore } from '../store/user-store';
import { findRefreshToken, clearTokens, useAuthStore } from '@/src/shared/api';
import { unregisterExpoPushOnLogout } from '@/src/modules/notifications/expo-push';

type UseLogoutOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export function useLogout(options?: UseLogoutOptions) {
  const removeUser = useUserStore((s) => s.removeUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // ⚠️ CLI 스크립트(scripts/api.js)에서 같은 refresh token을 쓰는 동안엔
      //     서버 로그아웃 호출 시 refresh가 무효화되어 CLI가 막힘 → 임시 주석.
      // const rt = await findRefreshToken();
      // if (rt) await logout(rt);
    },
    onSettled: async (_data, error) => {
      // 1. 핵심 상태 변경 (항상 실행)
      await clearTokens();
      removeUser();
      clearAuth();
      queryClient.clear();

      // 2. 푸시 토큰 해제
      try {
        await unregisterExpoPushOnLogout();
      } catch (err) {
        console.warn('[useLogout] push unregister error:', err);
      }

      // 3. UI 책임 (트래킹 등)
      if (error) {
        options?.onError?.(error as Error);
      } else {
        options?.onSuccess?.();
      }
      options?.onSettled?.();
    },
  });
}
