# 리팩토링: 레거시 shadow → boxShadow

## 라벨
`expo` `styling` `shadow` `MEDIUM`

## 현상
Expo 가이드라인: "Use CSS `boxShadow` style prop. NEVER use legacy React Native shadow or elevation styles."

`src/shared/constants/shadow.ts`에서 Platform 분기로 레거시 shadow 사용:
```tsx
// 레거시 (현재)
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 8,
elevation: 3,

// 모던 (개선)
boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
```

## 영향 범위
- `src/shared/constants/shadow.ts` (SHADOW, SKELETON_SHADOW 상수)
- 이 상수를 사용하는 모든 컴포넌트

## 발견 경위
Expo UI Guidelines — "Use CSS boxShadow. NEVER use legacy shadow styles."
