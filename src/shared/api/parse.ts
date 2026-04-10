import type { z } from 'zod';

/**
 * 환경 분기 schema 검증 헬퍼.
 *
 * - **개발(`__DEV__`)**: 검증 실패 시 즉시 throw → 빨간 에러 화면 → 개발자가 못 보고 넘어갈 수 없음
 * - **운영**: 경고 로그 + 폴백 값 반환 → 사용자 앱이 안 깨짐
 *
 * 두 함수의 차이는 운영 폴백 동작:
 * - `parseOrNull`  → 실패 시 `null` 반환 (단일 객체 응답용)
 * - `parseOrEmpty` → 실패 시 빈 array 또는 빈 객체 반환 (리스트 응답용)
 *
 * 사용 예:
 * ```ts
 * const parsed = parseOrNull(RawSchema, res.data, 'BalanceAPI');
 * if (!parsed) return { balance: 0 };
 * return { balance: parsed.balance ?? 0 };
 * ```
 */

function formatIssues(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  - ');
}

/**
 * 검증 실패 시:
 * - dev → throw
 * - prod → null 반환
 */
export function parseOrNull<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  label: string,
): T | null {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const message = `[${label}] schema validation failed:\n  - ${formatIssues(parsed.error.issues)}`;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(message, '\nraw data:', data);
    throw new Error(message);
  }

  // eslint-disable-next-line no-console
  console.warn(message);
  return null;
}

/**
 * 검증 실패 시:
 * - dev → throw
 * - prod → fallback 반환
 *
 * fallback이 빈 object/array가 자연스러운 리스트 응답에 사용.
 */
export function parseOrFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  label: string,
  fallback: T,
): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const message = `[${label}] schema validation failed:\n  - ${formatIssues(parsed.error.issues)}`;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(message, '\nraw data:', data);
    throw new Error(message);
  }

  // eslint-disable-next-line no-console
  console.warn(message);
  return fallback;
}
