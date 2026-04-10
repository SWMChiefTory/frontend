# 리팩토링: 하드코딩 색상 → 디자인 토큰

## 라벨
`design-system` `tokens` `MEDIUM`

## 현상
CLAUDE.md 규칙: "하드코딩 색상/spacing/radius 값 금지"
하지만 최근 추가된 테마 컴포넌트들에 하드코딩 색상 다수:

```tsx
// 반복 패턴
color: '#111'          // → colors.text.primary
color: '#fff'          // → '#FFFFFF' 또는 colors 토큰
color: '#9CA3AF'       // → colors.text.disabled 또는 secondary
backgroundColor: '#F5F5F7'  // → colors.surface 또는 새 토큰
color: '#D6336C'       // → hook 핑크, 토큰 추가 필요
color: '#FF7AB6'       // → hook 핑크 dark, 토큰 추가 필요
```

## 주요 위반 파일
- `src/pages/theme/components/category-selector-sheet.tsx`
- `src/pages/theme/components/dish-list-card.tsx`
- `src/pages/theme/components/mood-selector-sheet.tsx`
- `src/pages/theme/components/theme-banner.tsx`
- `src/pages/theme/ui/theme-detail-screen.tsx`
- `src/pages/home/components/recipe-section.tsx`

## 개선 방향
1. 반복되는 하드코딩 값을 tokens.ts에 새 토큰으로 추가
2. 사용처를 토큰 참조로 변경
3. 다크모드 대응 시 토큰만 바꾸면 전체 반영되는 구조

## 발견 경위
자율 탐색 — AI 세션에서 작성한 테마 컴포넌트 전반
