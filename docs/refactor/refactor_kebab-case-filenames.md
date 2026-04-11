# 리팩토링: 파일명 kebab-case 통일

## 라벨
`convention` `naming` `HIGH`

## 현상
CLAUDE.md 규칙: "kebab-case 사용: recipe-detail-screen.tsx, use-recipe.ts"
하지만 ~40개 파일이 PascalCase/camelCase.

## 위반 파일 (대표)

### PascalCase 컴포넌트
- `RecipeStepScreen.tsx` → `recipe-step-screen.tsx`
- `IntentFeedbackToast.tsx` → `intent-feedback-toast.tsx`
- `PawFeedback.tsx` → `paw-feedback.tsx`
- `TimerBottomSheet.tsx` → `timer-bottom-sheet.tsx`
- `SpeechCaptionBar.tsx` → `speech-caption-bar.tsx`
- `OnlyBackTemplate.tsx` → `only-back-template.tsx`
- `FullScreenLoader.tsx` → `full-screen-loader.tsx`
- `SplashScreenController.tsx` → `splash-screen-controller.tsx`
- `GlobalErrorBoundary.tsx` → `global-error-boundary.tsx`
- `TermsAndConditionsModalContent.tsx` → `terms-and-conditions-modal-content.tsx`

### camelCase 유틸/스토어
- `audioUtils.ts` → `audio-utils.ts`
- `marketCache.ts` → `market-cache.ts`
- `marketStore.ts` → `market-store.ts`
- `marketUtils.ts` → `market-utils.ts`
- `deviceLocale.ts` → `device-locale.ts`
- `responsiveUI.ts` → `responsive-ui.ts`
- `amplitudeEvents.ts` → `amplitude-events.ts`
- `amplitudeTracker.ts` → `amplitude-tracker.ts`
- `languagePreference.ts` → `language-preference.ts`
- `secureStorage.ts` → `secure-storage.ts` (이미 secure-storage.ts 있을 수 있음 확인)

### camelCase 훅
- `useStepNavigation.ts` → `use-step-navigation.ts`
- `useVideoControl.ts` → `use-video-control.ts`
- `useIntentMatchingAction.ts` → `use-intent-matching-action.ts`
- `useVoiceCommand.ts` → `use-voice-command.ts`
- `useWebAudioPipeline.ts` → `use-web-audio-pipeline.ts`
- `useLocalNLU.ts` → `use-local-nlu.ts`
- `useStepTimer.ts` → `use-step-timer.ts`
- `useMarketBootstrap.ts` → `use-market-bootstrap.ts`
- `onnxNLU.ts` → `onnx-nlu.ts`
- `sileroVAD.ts` → `silero-vad.ts`

## 영향 범위
- ~40개 파일 리네이밍
- 모든 import 경로 일괄 변경
- barrel export (index.ts) 경로 변경

## 실행 방법
git mv로 리네이밍 → 전체 import 경로 sed/grep 일괄 치환 → tsc 검증

## 발견 경위
코드 리뷰 — "어떤 파일은 kebab, 어떤 파일은 camelCase"
