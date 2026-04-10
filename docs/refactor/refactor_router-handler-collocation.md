# 리팩토링: 라우터 핸들러 응집도 개선

## 라벨
`router` `collocation` `home` `bookmark`

## 현상
`home-screen.tsx`에 단순 `router.push` 핸들러 7개가 부모에 몰려있음.
자식 컴포넌트는 `onPress` props를 받기만 하고, 일부 자식(`recipe-section.tsx`, `dish-list-card.tsx`)은 직접 `router.push`를 호출 — 규칙이 혼재.

## 현재 코드
```tsx
// home-screen.tsx — 부모에 7개 핸들러
const handleSearchPress = useCallback(() => { router.push('/search'); }, []);
const handleSettingsPress = useCallback(() => { router.push('/settings'); }, []);
const handleThemePress = useCallback((card) => { router.push(`/theme/${card.id}`); }, []);
// ... 등등

// recipe-section.tsx — 자식에서 직접 호출 (규칙 위반)
onPress={() => router.push(`/native-step/${recipe.id}`)}
```

## 개선 방향
**기준**: 
- 공유 핸들러 (track + navigate, 여러 자식이 공유) → 부모에서 선언
- 단독 핸들러 (한 컴포넌트에서만 쓰는 단순 push) → 자식에서 직접 선언

**구체적 변경**:
1. `handleSearchPress`, `handleSettingsPress`, `handleThemePress` → 각 자식 컴포넌트로 이동
2. `handleRecipePress` (track + push, 여러 자식 공유) → 부모 유지
3. `handleCreatePress` (외부 props 전달) → 부모 유지
4. `recipe-section.tsx`의 직접 `router.push` → 핸들러 패턴으로 통일
5. `bookmark-screen.tsx`에도 동일 기준 적용

## 영향 범위
- `src/pages/home/ui/home-screen.tsx`
- `src/pages/home/components/recipe-section.tsx`
- `src/pages/home/components/home-header.tsx`
- `src/pages/home/components/feature-cards.tsx`
- `src/pages/bookmark/ui/bookmark-screen.tsx`
- `src/pages/bookmark/components/recipe-grid.tsx`

## CLAUDE.md 반영
```markdown
## 네비게이션 핸들러 규칙
- 단순 router.push 1줄 핸들러는 사용하는 컴포넌트에서 직접 선언
- 부모에서 선언하는 건: track() 포함 / 여러 자식 공유 / 조건부 분기 시만
- 같은 화면 안에서 규칙 혼재 금지
```

## 발견 경위
홈 화면 코드 리뷰 중 — "왜 전부 부모에 있지?" → 응집도 vs 조감도 트레이드오프 논의
