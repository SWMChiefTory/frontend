import type { Gender } from './gender';
import type { OauthProvider } from './oauth-provider';
import type { DateOnly } from '@/src/shared/utils/dateOnly';

export type { Gender } from './gender';
export type { OauthProvider } from './oauth-provider';

export type LoginInfo = {
  id_token: string;
  provider: OauthProvider;
}

export type SignupData = {
  id_token: string;
  provider: OauthProvider;
  nickname: string;
  gender: Gender | null;
  date_of_birth: DateOnly | null;
  is_marketing_agreed: boolean;
  is_privacy_agreed: boolean;
  is_terms_of_use_agreed: boolean;
}

export type UserResponse = {
  provider_sub: string;
  gender: Gender | null;
  nickname: string;
  date_of_birth: string | null;
  is_marketing_agreed: boolean;
  is_privacy_agreed: boolean;
  is_terms_of_use_agreed: boolean;
}

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user_info: UserResponse;
}
