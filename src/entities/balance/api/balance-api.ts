import { z } from 'zod';
import { isAxiosError } from 'axios';
import { client } from '@/src/shared/api';

// ─── Constants ───────────────────────────────────────────────────
export const SHARE_LIMIT = 5;
export const CREDIT_PER_SHARE = 5;

// ─── Schemas ─────────────────────────────────────────────────────
const RawBalanceSchema = z
  .object({
    balance: z.number().nullish(),
  })
  .passthrough();

const RawShareResponseSchema = z
  .object({
    share_count: z.number().nullish(),
    shareCount: z.number().nullish(),
  })
  .passthrough();

// ─── Client types ────────────────────────────────────────────────
export interface Balance {
  balance: number;
}

export interface RechargeResponse {
  amount: number;
  remainingCount: number;
}

// ─── Errors ──────────────────────────────────────────────────────
export class LimitExceededError extends Error {
  constructor() {
    super('충전 횟수를 모두 사용했어요.');
    this.name = 'LimitExceededError';
    Object.setPrototypeOf(this, LimitExceededError.prototype);
  }
}

const ERROR_CODES = {
  LIMIT_EXCEEDED: 'USER_SHARE_001',
  SHARE_CREATE_FAILED: 'USER_SHARE_002',
} as const;

// ─── APIs ────────────────────────────────────────────────────────
export async function fetchBalance(): Promise<Balance> {
  try {
    const res = await client.get('/credit/balance');
    const parsed = RawBalanceSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[BalanceAPI] schema error:', parsed.error.issues);
      return { balance: 0 };
    }
    return { balance: parsed.data.balance ?? 0 };
  } catch (err: any) {
    console.warn('[BalanceAPI] fetchBalance error:', err?.response?.status, err?.message);
    return { balance: 0 };
  }
}

export async function completeRecharge(): Promise<RechargeResponse> {
  try {
    const res = await client.post('/users/share');
    const parsed = RawShareResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[BalanceAPI] share schema error:', parsed.error.issues);
      throw new Error('충전 응답 형식이 올바르지 않아요.');
    }
    const shareCount = parsed.data.share_count ?? parsed.data.shareCount ?? 0;
    return {
      amount: CREDIT_PER_SHARE,
      remainingCount: Math.max(SHARE_LIMIT - shareCount, 0),
    };
  } catch (error) {
    if (isAxiosError(error)) {
      const data = error.response?.data;
      const errorCode = data?.errorCode ?? data?.error_code;
      if (errorCode === ERROR_CODES.LIMIT_EXCEEDED) {
        throw new LimitExceededError();
      }
    }
    console.warn('[BalanceAPI] completeRecharge error:', error);
    throw new Error('충전에 실패했어요. 다시 시도해주세요.');
  }
}
