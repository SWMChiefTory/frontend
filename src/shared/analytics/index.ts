export {
  initAmplitude,
  setAmplitudeUserId,
  resetAmplitudeUser,
} from "./amplitude";

// 신규 타입 안전 API — 새 코드는 이걸 사용
export { track } from "./track";
export type { AmplitudeEventName, EventPropsMap } from "./track";
export {
  AppEvents,
  AuthEvents,
  OnboardingEvents,
  RecipeCreateEvents,
  RecipeEnrollEvents,
  RecipeEvents,
  RecipeDetailEvents,
  CookingModeEvents,
  CookingCommandDetails,
  SearchEvents,
  CategoryEvents,
  CoupangEvents,
  RechargeEvents,
  ThemeEvents,
  ReportEvents,
  ContactEvents,
  AccountEvents,
  TutorialShareEvents,
} from "./events";

// @deprecated 점진 마이그레이션 중 — 신규 코드는 track() 사용
export { trackNative } from "./amplitudeTracker";
export { AmplitudeEvent } from "./amplitudeEvents";
