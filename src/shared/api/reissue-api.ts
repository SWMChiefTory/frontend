import axios from 'axios';

type ReissueResponse = {
  access_token: string;
  refresh_token: string;
}

/**
 * 토큰 재발급 전용 — raw axios 사용 (client.ts와 순환 의존 방지).
 */
export async function reissueRefreshToken(refreshToken: string): Promise<ReissueResponse> {
  const res = await axios.post(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/token/reissue`,
    { refresh_token: refreshToken },
    { timeout: 10000 },
  );
  return res.data;
}
