# 리팩토링: app/ 디렉토리에 있는 스크린 로직을 pages/로 이동

## 라벨
`architecture` `expo` `route-structure` `HIGH`

## 현상
Expo 가이드라인: "app/ 디렉토리에 컴포넌트, 타입, 유틸리티를 같이 두지 마라. Anti-pattern이다."
하지만 현재:
- `src/app/(app)/search.tsx` — 390줄 풀 스크린 구현 (훅, 상태, 쿼리, 이벤트 핸들러 전부)
- `src/app/(app)/settings.tsx` — 217줄 + helper 컴포넌트 3개(SettingsItem, Divider, SectionHeader) + useUserProfile 훅

## 개선 방향
app/ route 파일은 thin wrapper만. 로직은 pages/로:

```tsx
// src/app/(app)/search.tsx (after)
import { SearchScreen } from '@/src/pages/search/ui/search-screen';
export default function SearchRoute() {
  return <SearchScreen />;
}

// src/pages/search/ui/search-screen.tsx (after)
// 기존 390줄 전부 여기로
```

settings도 동일:
```
src/pages/settings/ui/settings-screen.tsx
src/pages/settings/components/settings-item.tsx (3번+ 사용되면 분리)
```

## 영향 범위
- `src/app/(app)/search.tsx` → `src/pages/search/ui/search-screen.tsx`
- `src/app/(app)/settings.tsx` → `src/pages/settings/ui/settings-screen.tsx`

## 발견 경위
Expo UI Guidelines `route-structure` — "Never co-locate components, types, or utilities in the app directory"
