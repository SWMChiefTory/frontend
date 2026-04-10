# 리팩토링: barrel export 우회 import 통일

## 라벨
`architecture` `fsd` `import` `HIGH`

## 현상
CLAUDE.md 규칙: "entities 내부 파일 직접 import 금지 (반드시 barrel 경유)"
하지만 5곳에서 내부 경로 직접 import:

```tsx
// ❌ 직접 import
import { createCategory } from '@/src/entities/recipe/api/user-recipe-api';      // bookmark-screen
import { fetchSearchRecipes } from '@/src/entities/recipe/api/search-api';        // search.tsx
import { RecommendType } from '@/src/entities/recipe/api/recommend-api';          // home-screen
import { amplitudeEvents } from '@/src/shared/analytics/amplitudeEvents';         // settings
import { client } from '@/src/shared/api/client';                                 // 3곳
```

## 개선 방향
1. 필요한 export가 barrel에 없으면 → barrel에 추가
2. 사용처를 barrel import로 통일

```tsx
// ✅ barrel 경유
import { createCategory, RecommendType } from '@/src/entities/recipe';
import { client } from '@/src/shared/api';
```

## Vercel 관점 (`bundle-barrel-imports`)
barrel이 번들 사이즈를 키울 수 있다는 Vercel 규칙이 있지만, Metro(Expo) 번들러는 tree-shaking 지원하므로 barrel 사용이 안전함. 일관성 > 미세한 번들 최적화.

## 영향 범위
- `src/pages/bookmark/ui/bookmark-screen.tsx`
- `src/app/(app)/search.tsx`
- `src/pages/home/ui/home-screen.tsx`
- `src/app/(app)/settings.tsx`
- `src/pages/home/components/recipe-create-sheet.tsx`
- `src/entities/recipe/index.ts` (export 추가)

## 발견 경위
자율 탐색 — barrel 규칙 위반 grep
