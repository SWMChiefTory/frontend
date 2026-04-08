# ChefTory React Native 컨벤션

이 파일은 Claude Code가 이 프로젝트에서 코드를 작성/수정할 때 따라야 할 규칙을 정의합니다.

## 프로젝트 구조

```
src/
├── app/                      # expo-router 라우트 (파일 기반 라우팅)
│   ├── (app)/                # 인증된 앱 라우트
│   ├── (auth)/               # 인증/로그인 라우트
│   └── _layout.tsx
├── pages/                    # 화면 단위 컴포넌트 (feature별)
│   └── {feature}/
│       ├── ui/               # 메인 스크린 컴포넌트
│       ├── components/       # 화면 내부에서만 쓰는 서브 컴포넌트
│       ├── hooks/            # 화면 전용 훅
│       └── model/            # 화면 전용 상태/로직
├── entities/                 # 도메인 레이어 (재사용 가능한 비즈니스 로직)
│   └── {domain}/
│       ├── api/              # API 함수 + zod 스키마 + 변환 함수
│       ├── hooks/            # React Query 훅 (use-xxx.ts)
│       ├── store/            # Zustand 스토어 (있는 경우)
│       ├── model/            # 도메인 모델 클래스 (있는 경우)
│       └── index.ts          # ⭐ barrel export (외부는 이것만 import)
├── shared/                   # 공통 인프라 (도메인 무관)
│   ├── api/                  # axios client, 토큰, 인증 스토어, 갱신 로직
│   ├── analytics/
│   ├── components/           # 공통 UI 컴포넌트
│   ├── design/               # 디자인 토큰
│   ├── hooks/                # 공통 훅
│   ├── splash/
│   ├── store/
│   ├── utils/
│   └── webview/
├── modules/                  # 외부 시스템 연동 (push, OAuth 등)
│   └── notifications/
└── widgets/                  # 페이지 간 공유되는 큰 UI 블록
```

### 계층 의존성 규칙 (단방향)

```
shared/  ←  entities/  ←  pages/  ←  app/
```

- `shared`는 누구도 import하지 않음 (leaf)
- `entities`는 `shared`만 import
- `pages`는 `entities` + `shared` import
- `app`은 모두 import 가능
- **역방향 import 금지** (예: `shared`가 `entities`를 import 안 함)

## 파일 네이밍

- **kebab-case** 사용: `recipe-detail-screen.tsx`, `use-recipe.ts`, `auth-store.ts`
- 예외:
  - React 컴포넌트 클래스명은 PascalCase: `function RecipeScreen()`
  - 클래스는 PascalCase: `class User`
- 폴더명도 kebab-case: `recipe-detail/`, `bottom-sheet/`

## API 레이어 작성 패턴 ⭐

새 API를 추가할 때는 **반드시 이 패턴**을 따른다 (`entities/recipe/api/recommend-api.ts` 참조).

### 파일 구조

```ts
import { z } from 'zod';
import { client } from '@/src/shared/api';

// ─── 1. Raw schema (서버 응답, snake_case) ───
const RawXxxSchema = z
  .object({
    field_a: z.string(),
    field_b: z.number().nullish(),
  })
  .passthrough();  // 추가 필드 허용

const RawXxxResponseSchema = z
  .object({
    items: z.array(RawXxxSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  })
  .passthrough();

type RawXxx = z.infer<typeof RawXxxSchema>;

// ─── 2. Client type (앱이 사용할 모양, camelCase) ───
export interface Xxx {
  fieldA: string;
  fieldB: number;
}

export interface XxxPage {
  data: Xxx[];
  nextCursor: string | null;
  hasNext: boolean;
}

// ─── 3. Transformer (raw → client) ───
function toXxx(raw: RawXxx): Xxx {
  return {
    fieldA: raw.field_a,
    fieldB: raw.field_b ?? 0,
  };
}

// ─── 4. API 함수 ───
export async function fetchXxx(): Promise<XxxPage> {
  try {
    const res = await client.get('/xxx');
    const parsed = RawXxxResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[XxxAPI] schema error:', parsed.error.issues);
      return { data: [], nextCursor: null, hasNext: false };
    }
    return {
      data: parsed.data.items.map(toXxx),
      nextCursor: parsed.data.next_cursor ?? null,
      hasNext: parsed.data.has_next ?? false,
    };
  } catch (err: any) {
    console.warn('[XxxAPI] fetch error:', err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}
```

### 규칙 요약

1. **zod 스키마로 raw 응답 검증** (snake_case 그대로)
2. **별도 transformer 함수로 변환** (snake_case → camelCase + 기본값)
3. **client type은 export, raw type은 internal** (내부 type alias만)
4. **safeParse 사용** + 실패 시 경고 로그 + 빈 결과 반환 (UI가 깨지지 않게)
5. **에러 처리**: `try/catch`로 네트워크 에러도 빈 결과 반환
6. `.passthrough()`로 서버가 추가 필드 보내도 통과
7. **`client`는 `@/src/shared/api`에서 import** (직접 `client.ts` 경로 X)

## React Query 훅 작성 패턴 ⭐

API를 호출하는 모든 곳은 **React Query 훅을 거친다**. 컴포넌트가 직접 API 함수를 호출하지 않음.

### 파일 위치
`src/entities/{domain}/hooks/use-{name}.ts`

### 패턴

```ts
// entities/recipe/hooks/use-recommend-recipes.ts
import { useQuery } from '@tanstack/react-query';
import { fetchRecommendRecipes, RecommendType } from '../api/recommend-api';

export function useRecommendRecipes(type: RecommendType) {
  return useQuery({
    queryKey: ['recommendRecipes', type],
    queryFn: () => fetchRecommendRecipes(type),
    staleTime: 5 * 60 * 1000,
  });
}
```

### 규칙

- **queryKey는 명확히** (`['recommendRecipes', type]`처럼 의존성 포함)
- **staleTime**: 자주 안 바뀌는 데이터는 5분, 자주 바뀌는 건 1~2분
- **enabled**: 인자가 optional이면 `enabled: !!id` 추가
- **mutation**: `useMutation` + `onSuccess`/`onError`/`onSettled`로 후처리
- **suspense 필요 시**: `useSuspenseQuery` 사용 (예: `use-recipe.ts`)

## Barrel Export ⭐

모든 `entities/{domain}/`은 `index.ts`에서 외부 노출 API를 정의.

```ts
// entities/recipe/index.ts
export type { Recipe, RecipeEntry, Step } from './api/types';
export { useRecipe } from './hooks/use-recipe';
export { useRecipeDetail } from './hooks/use-recipe-detail';
export { useRecommendRecipes } from './hooks/use-recommend-recipes';
export { useMyRecipes, useCategorizedRecipes, useCategories } from './hooks/use-my-recipes';
```

### 사용 측

```ts
// ❌ 나쁨
import { useRecipe } from '@/src/entities/recipe/hooks/use-recipe';

// ✅ 좋음
import { useRecipe } from '@/src/entities/recipe';
```

**규칙**:
- 외부에서 쓰는 모든 훅/타입/함수는 `index.ts`에서 export
- 사용처는 항상 `@/src/entities/{domain}` 경로로 import (내부 경로 직접 X)
- 내부 구현(api 함수, transformer 등)은 export하지 않음

## 디자인 시스템

`src/shared/design/tokens.ts`의 토큰만 사용. 하드코딩 값 금지.

```ts
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';

// ❌ 나쁨
<View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12 }} />

// ✅ 좋음
<View style={{ padding: spacing.lg, backgroundColor: colors.background, borderRadius: radius.md }} />
```

### 다크 모드
`colors.dark.*` 사용 (예: `colors.dark.background`, `colors.dark.text.primary`).

### 폰트
- 제목: `typography.heading.fontFamily` ('KHNPHandotumOTF')
- 본문: `typography.body.fontFamily` ('Pretendard')

## 인증 처리

- **자동 처리**: `client`는 interceptor가 토큰을 자동 첨부하고 만료 시 자동 refresh
- **개발자가 신경 쓸 일**: 인증 없이 호출하는 경우만 `{ skipAuth: true }` 옵션 추가
- **토큰 저장/삭제**: `storeTokens()`, `clearTokens()` from `@/src/shared/api`
- **인증 상태**: `useAuthStore` from `@/src/shared/api` (`isAuthenticated`만)
- **사용자 객체**: `useUserStore` from `@/src/entities/user`

```ts
// 인증 필요 (기본)
const res = await client.get('/recipes');

// 인증 불필요 (예외)
const res = await client.post('/account/login/oauth', data, { skipAuth: true });
```

## 컴포넌트 작성

- **inline style 사용** (StyleSheet 거의 안 씀)
- **재사용 1회면 컴포넌트화 X** (3번 반복되면 분리)
- **useCallback**: 자식 컴포넌트 props로 넘기는 핸들러는 useCallback
- **useMemo**: 계산 비용이 있는 derived state만
- **이모지 금지**: `Ionicons` from `@expo/vector-icons` 사용

## 금지 사항

- ❌ 새 webview 페이지 추가 (네이티브로 구현)
- ❌ 하드코딩 색상/spacing/radius 값
- ❌ snake_case 응답을 컴포넌트까지 그대로 전달 (transformer에서 변환)
- ❌ axios 호출 시 `client` 외 다른 인스턴스 사용
- ❌ 토큰을 SecureStore 외 저장
- ❌ entities 내부 파일 직접 import (반드시 barrel 경유)
- ❌ shared가 entities/pages를 import
- ❌ 이모지를 UI 텍스트로 사용

## 새 기능 추가 시 체크리스트

새 API/feature 추가 요청을 받으면 다음 순서로:

1. [ ] `src/entities/{domain}/api/{name}-api.ts` 생성
   - zod raw schema → client type → transformer → fetch 함수
2. [ ] `src/entities/{domain}/hooks/use-{name}.ts` 생성 (React Query 훅)
3. [ ] `src/entities/{domain}/index.ts`에 export 추가
4. [ ] `src/pages/{feature}/`에서 훅 호출 (UI)
5. [ ] 디자인 토큰 사용 확인 (하드코딩 금지)
6. [ ] TypeScript 검증 (`npx tsc --noEmit`)

## 기존 좋은 참조

- API 패턴: `src/entities/recipe/api/recommend-api.ts`
- 훅 패턴: `src/entities/recipe/hooks/use-recommend-recipes.ts`
- 화면 패턴: `src/pages/home/ui/home-screen.tsx`
- 컴포넌트 분리 패턴: `src/pages/theme/components/`
- 인증 인프라: `src/shared/api/refresh-token.ts`
