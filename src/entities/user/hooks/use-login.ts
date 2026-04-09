import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth-api';
import { useUserStore } from '../store/user-store';
import { User } from '../model/user';
import { storeTokens, useAuthStore } from '@/src/shared/api';
import { DateOnly } from '@/src/shared/utils/dateOnly';
import type { AuthResponse, LoginInfo } from '../api/types';

type UseLoginOptions = {
  onSuccess?: (data: AuthResponse, variables: LoginInfo) => void;
  onError?: (error: Error, variables: LoginInfo) => void;
}

export function useLogin(options?: UseLoginOptions) {
  const setUser = useUserStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  return useMutation({
    mutationFn: login,
    onSuccess: async (data, variables) => {
      // 도메인 책임: 토큰 저장 + 상태 업데이트
      await storeTokens(data.access_token, data.refresh_token);
      const user = User.create({
        gender: data.user_info.gender,
        nickname: data.user_info.nickname,
        dateOfBirth: data.user_info.date_of_birth
          ? DateOnly.create(data.user_info.date_of_birth)
          : null,
        isMarketingAgreed: data.user_info.is_marketing_agreed,
        isPrivacyAgreed: data.user_info.is_privacy_agreed,
        isTermsOfUseAgreed: data.user_info.is_terms_of_use_agreed,
      });
      setUser(user);
      setAuthenticated();

      // UI 책임: 트래킹/분석은 호출자에게 위임
      options?.onSuccess?.(data, variables);
    },
    onError: (err, variables) => options?.onError?.(err as Error, variables),
    throwOnError: false,
  });
}
