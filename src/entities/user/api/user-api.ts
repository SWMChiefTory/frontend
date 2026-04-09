import { client } from '@/src/shared/api';
import { DateOnly } from '@/src/shared/utils/dateOnly';
import type { Gender } from './gender';

export type MeResponse = {
  provider_sub: string;
  gender: Gender | null;
  nickname: string;
  date_of_birth: DateOnly | null;
  is_marketing_agreed: boolean;
  is_privacy_agreed: boolean;
  is_terms_of_use_agreed: boolean;
}

type RawMeResponse = {
  provider_sub: string;
  gender: Gender | null;
  nickname: string;
  date_of_birth: string | null;
  marketing_agreed_at: string | null;
  privacy_agreed_at: string | null;
  terms_of_use_agreed_at: string | null;
}

function mapMe(raw: RawMeResponse): MeResponse {
  return {
    provider_sub: raw.provider_sub,
    gender: raw.gender,
    nickname: raw.nickname,
    date_of_birth: raw.date_of_birth ? DateOnly.create(raw.date_of_birth) : null,
    is_marketing_agreed: !!raw.marketing_agreed_at,
    is_privacy_agreed: !!raw.privacy_agreed_at,
    is_terms_of_use_agreed: !!raw.terms_of_use_agreed_at,
  };
}

export async function getUser(): Promise<MeResponse> {
  const res = await client.get('/users/me');
  if (!res.data) throw new Error('응답에 body가 없습니다.');
  return mapMe(res.data);
}
