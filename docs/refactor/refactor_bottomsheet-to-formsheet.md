# 리팩토링: BottomSheet → Expo Router formSheet 전환

## 라벨
`expo` `navigation` `bottomsheet` `HIGH`

## 현상
`@gorhom/bottom-sheet`를 13곳에서 사용 중. 일부는 완전한 독립 화면이라 Expo Router의 네이티브 `presentation: "formSheet"`로 대체 가능.

## Expo 가이드라인
> "Present a screen as a dynamic form sheet... Using `contentStyle: { backgroundColor: 'transparent' }` makes the background liquid glass on iOS 26+."

## 전환 후보 (독립 화면 성격)

| 현재 | 위치 | formSheet 적합도 |
|---|---|---|
| 카테고리 관리 시트 | bookmark-screen.tsx | ✅ 높음 — 독립 CRUD 화면 |
| 카테고리 추가 시트 | bookmark-screen.tsx | ✅ 높음 — 입력 폼 |
| 베리 충전 시트 | credit-recharge-sheet.tsx | ✅ 높음 — 글로벌 결제 UI |
| 레시피 신고 시트 | recipe-report-sheet.tsx | ✅ 높음 — 신고 폼 |

## 유지 후보 (컨텍스트 의존적)

| 현재 | 이유 |
|---|---|
| CategorySelectorSheet | 테마 내 인라인 선택 UI, 빠른 전환 |
| MoodSelectorSheet | 동일 |
| RecipeCreateSheet | URL 입력 → 즉시 생성, 빠른 인터랙션 |
| TimerBottomSheet | 요리 중 부분 시트, 배경 유지 필수 |

## 전환 시 구조

```tsx
// app/(app)/category-manage.tsx
export default function CategoryManageRoute() {
  return <CategoryManageScreen />;
}

// app/(app)/_layout.tsx 에 추가
<Stack.Screen
  name="category-manage"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.6, 1.0],
  }}
/>
```

## 장점
- 네이티브 제스처 (스와이프 dismiss) 자동
- iOS 26+ liquid glass 효과
- ref 관리/imperative handle 불필요
- 메모리 효율 (unmount on dismiss)

## 영향 범위
- `src/pages/bookmark/ui/bookmark-screen.tsx` (4개 시트 제거)
- `src/widgets/credit-recharge/credit-recharge-sheet.tsx` → route로 전환
- `src/widgets/recipe-report/recipe-report-sheet.tsx` → route로 전환
- `src/app/(app)/_layout.tsx` (새 route 등록)

## 발견 경위
Expo UI Guidelines `form-sheet` — "Prefer this to building a custom modal component"
