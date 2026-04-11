import axios, { isAxiosError } from 'axios';
import { findAccessToken } from './secure-storage';
import { refreshToken } from './refresh-token';
import { useMarketStore } from '../store/marketStore';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response && Boolean(error.request);
}

// Request: 토큰 + market 헤더 자동 첨부
client.interceptors.request.use(
  async (config) => {
    // market 헤더 (언어 설정에 따라 서버 응답 다르게)
    const market = useMarketStore.getState().market;
    if (market) config.headers['X-Market'] = market;

    if (config.skipAuth) return config;
    const token = await findAccessToken();
    if (token) config.headers.Authorization = token;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response: AUTH 에러면 refresh 후 재시도
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original.skipAuth) return Promise.reject(error);

    const isAuthError =
      isAxiosError(error) &&
      error.response?.data?.errorCode?.startsWith('AUTH') &&
      !original._retry;

    if (isAuthError) {
      original._retry = true;
      // 원래 요청에 토큰이 없었다면 refresh 시도하지 않음 (로그아웃 상태)
      if (!original.headers?.Authorization) {
        return Promise.reject(error);
      }
      try {
        const newToken = await refreshToken();
        original.headers.Authorization = newToken;
        return client(original);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (isNetworkError(error)) {
      setTimeout(() => Promise.reject(error), 200);
    }
    return Promise.reject(error);
  },
);
