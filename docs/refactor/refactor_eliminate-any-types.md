# 리팩토링: `any` 타입 제거

## 라벨
`typescript` `type-safety` `any`

## 현상
pages 레이어에서 `any` 타입 15곳+ 사용 중. 타입 안전성 없음.

## 핫스팟 (우선순위 순)

### 1. home-screen.tsx — 콜백 파라미터 (3곳)
```tsx
// card: any → ThemeCard, recipe: any → RecipeCard, data: any[] → 서버 타입
const handleThemePress = useCallback((card: any) => { ... });
const handleRecipePress = useCallback((recipe: any) => { ... });
function toRecipeCards(data: any[] | undefined): RecipeCard[] { ... }
```
→ 이미 `ThemeCard`, `RecipeCard` 타입이 있으므로 교체만 하면 됨.

### 2. RecipeStepScreen.tsx — 전면적 any (6곳+)
```tsx
recipe: any;  // props 타입부터 any
steps.reduce((acc: number, s: any) => ...)
```
→ `RecipeDetail` / `RecipeStep` 타입으로 교체. entities에 이미 정의됨.

### 3. ServiceTermsAndCondition.tsx — section: any (3곳)
→ 약관 데이터 구조 타입 정의 필요.

### 4. catch (err: any) — 허용 가능
```tsx
} catch (err: any) {
```
→ TS에서 catch 파라미터 타이핑은 `unknown`이 권장이지만, `any`도 관례적으로 허용. 낮은 우선순위.

## 개선 효과
- IDE 자동완성 활성화 (card.id, recipe.title 등)
- 오타로 인한 런타임 에러 방지
- 리팩토링 시 영향 범위 추적 가능

## 영향 범위
- `src/pages/home/ui/home-screen.tsx`
- `src/pages/native-step/ui/RecipeStepScreen.tsx`
- `src/pages/service-terms-and-condition/ServiceTermsAndCondition.tsx`
- `src/pages/recipe-detail/ui/recipe-detail-screen.tsx`

## 발견 경위
자율 탐색 — `grep ": any"` 전체 스캔
