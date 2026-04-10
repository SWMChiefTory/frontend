# 리팩토링: Dimensions.get() → useWindowDimensions

## 라벨
`expo` `responsive` `dimensions` `HIGH`

## 현상
Expo 가이드라인: "ALWAYS prefer `useWindowDimensions` over `Dimensions.get()` to measure screen size"

4곳에서 모듈 스코프 `Dimensions.get()` 사용 — 화면 회전/멀티태스킹 시 갱신 안 됨:

```tsx
// src/shared/utils/responsiveUI.ts:6
const { width } = Dimensions.get("window");  // 앱 시작 시 1번만 실행

// src/shared/splash/loading/lottieview/FullScreenLoader.tsx:25-26
const { width, height } = Dimensions.get('window');

// src/shared/splash/logo/style/logostyle.ts:6
const { width } = Dimensions.get("window");

// src/pages/native-step/ui/RecipeStepScreen.tsx:25
const SCREEN_WIDTH = Dimensions.get('window').width;
// 같은 파일에 useWindowDimensions import도 있음 (불일치)
```

## 개선 방향
- 컴포넌트 내부: `useWindowDimensions()` 훅 사용
- 모듈 스코프 상수(threshold 등): `Dimensions.get()` 허용 (반응성 불필요한 경우)

```tsx
// Before
const SCREEN_WIDTH = Dimensions.get('window').width;

// After (컴포넌트 내부)
const { width } = useWindowDimensions();
```

## 영향 범위
- `src/shared/utils/responsiveUI.ts`
- `src/shared/splash/loading/lottieview/FullScreenLoader.tsx`
- `src/shared/splash/logo/style/logostyle.ts`
- `src/pages/native-step/ui/RecipeStepScreen.tsx`

## 발견 경위
Expo UI Guidelines — "ALWAYS prefer useWindowDimensions over Dimensions.get()"
