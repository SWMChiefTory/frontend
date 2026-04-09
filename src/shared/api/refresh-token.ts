import { findRefreshToken, storeTokens, clearTokens } from './secure-storage';
import { reissueRefreshToken } from './reissue-api';
import { useAuthStore } from './auth-store';

let refreshPromise: Promise<string> | null = null;

/**
 * 토큰 갱신 — 동시 호출은 단일 Promise로 통합되어 한 번만 실행됨.
 * 실패 시 토큰을 정리하고 인증 상태를 false로 변경 (라우터가 로그인 화면으로 리디렉션).
 */
export async function refreshToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const rt = await findRefreshToken();
      if (!rt) {
        // 로그아웃 상태에서 호출된 경우 — 조용히 실패
        useAuthStore.getState().clearAuth();
        throw new Error('NOT_AUTHENTICATED');
      }

      const res = await reissueRefreshToken(rt);
      await storeTokens(res.access_token, res.refresh_token);
      return res.access_token;
    } catch (err) {
      await clearTokens();
      useAuthStore.getState().clearAuth();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
