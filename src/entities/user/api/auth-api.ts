import { client } from '@/src/shared/api';
import type { LoginInfo, SignupData, AuthResponse, UserResponse } from './types';

interface RawUserResponse {
  provider_sub: string;
  gender: any;
  nickname: string;
  date_of_birth: string | null;
  marketing_agreed_at: string | null;
  privacy_agreed_at: string | null;
  terms_of_use_agreed_at: string | null;
}

interface RawAuthResponse {
  access_token: string;
  refresh_token: string;
  user_info: RawUserResponse;
}

function mapUser(raw: RawUserResponse): UserResponse {
  return {
    provider_sub: raw.provider_sub,
    gender: raw.gender,
    nickname: raw.nickname,
    date_of_birth: raw.date_of_birth,
    is_marketing_agreed: !!raw.marketing_agreed_at,
    is_privacy_agreed: !!raw.privacy_agreed_at,
    is_terms_of_use_agreed: !!raw.terms_of_use_agreed_at,
  };
}

function mapAuthResponse(raw: RawAuthResponse): AuthResponse {
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    user_info: mapUser(raw.user_info),
  };
}

export async function login(loginInfo: LoginInfo): Promise<AuthResponse> {
  const res = await client.post(
    '/account/login/oauth',
    { id_token: loginInfo.id_token, provider: loginInfo.provider },
    { skipAuth: true },
  );
  return mapAuthResponse(res.data);
}

export async function signup(signupData: SignupData): Promise<AuthResponse> {
  if (!signupData.is_privacy_agreed || !signupData.is_terms_of_use_agreed) {
    throw new Error('Privacy and terms of use must be agreed');
  }
  const res = await client.post(
    '/account/signup/oauth',
    {
      id_token: signupData.id_token,
      provider: signupData.provider,
      nickname: signupData.nickname,
      gender: signupData.gender,
      date_of_birth: signupData.date_of_birth,
      is_marketing_agreed: signupData.is_marketing_agreed,
      is_privacy_agreed: signupData.is_privacy_agreed,
      is_terms_of_use_agreed: signupData.is_terms_of_use_agreed,
    },
    { skipAuth: true },
  );
  return mapAuthResponse(res.data);
}

export async function logout(refreshToken: string): Promise<void> {
  await client.post(
    '/account/logout',
    { refresh_token: refreshToken },
    { skipAuth: true },
  );
}

export async function deleteAccount(refreshToken: string): Promise<void> {
  await client.delete('/account', {
    data: { refresh_token: refreshToken },
    skipAuth: true,
  });
}
