import { useMutation } from '@tanstack/react-query';
import { signup } from '../api/auth-api';
import { useUserStore } from '../store/user-store';
import { User } from '../model/user';
import { storeTokens, useAuthStore } from '@/src/shared/api';
import { DateOnly } from '@/src/shared/utils/dateOnly';
import type { AuthResponse, SignupData } from '../api/types';

type UseSignupOptions = {
  onSuccess?: (data: AuthResponse, variables: SignupData) => void;
  onError?: (error: Error, variables: SignupData) => void;
}

export function useSignup(options?: UseSignupOptions) {
  const setUser = useUserStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  return useMutation({
    mutationFn: signup,
    onSuccess: async (data, variables) => {
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

      options?.onSuccess?.(data, variables);
    },
    onError: (err, variables) => options?.onError?.(err as Error, variables),
    throwOnError: false,
  });
}
