import { useEffect, useState } from 'react';
import { getUser } from '../api/user-api';
import { useUserStore } from '../store/user-store';
import { User } from '../model/user';
import { findAccessToken, useAuthStore } from '@/src/shared/api';
import { setAmplitudeUserId } from '@/src/shared/analytics/amplitude';

/**
 * 앱 시작 시 SecureStorage에 토큰이 있으면 사용자 복원.
 * 토큰이 없거나 getUser 실패 시 인증 상태 false.
 */
export function useAuthBootstrap() {
  const setUser = useUserStore((s) => s.setUser);
  const removeUser = useUserStore((s) => s.removeUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await findAccessToken();
        if (!token) {
          if (!cancelled) {
            removeUser();
            clearAuth();
          }
          return;
        }
        const me = await getUser();
        if (cancelled) return;
        const user = User.create({
          gender: me.gender,
          nickname: me.nickname,
          dateOfBirth: me.date_of_birth,
          isMarketingAgreed: me.is_marketing_agreed,
          isPrivacyAgreed: me.is_privacy_agreed,
          isTermsOfUseAgreed: me.is_terms_of_use_agreed,
        });
        setUser(user);
        setAuthenticated();
        setAmplitudeUserId(me.provider_sub);
      } catch {
        if (!cancelled) {
          removeUser();
          clearAuth();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, isLoggedIn: isAuthenticated };
}
