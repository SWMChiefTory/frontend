/**
 * Amplitude 이벤트 도메인 그룹.
 *
 * 페이지는 필요한 그룹만 import 해서 사용:
 *   import { track, RecipeDetailEvents } from '@/src/shared/analytics';
 *   track(RecipeDetailEvents.VIEW, { recipe_id, ... });
 *
 * 이벤트명/프로퍼티는 웹뷰(`webview-v2`)와 호환 (funnel 공유 목적).
 * 새 프로퍼티 추가 시 EventPropsMap(track.ts)도 같이 수정할 것.
 */

// ─── App lifecycle ───
export const AppEvents = {
  LAUNCHED: "app_launched",
} as const;

// ─── Auth (네이티브 전용) ───
export const AuthEvents = {
  LOGIN_SUCCESS: "login_success",
  SIGNUP_SUCCESS: "signup_success",
  LOGOUT: "logout",
} as const;

// ─── Onboarding ───
export const OnboardingEvents = {
  START: "onboarding_start",
  SKIP: "onboarding_skip",
  COMPLETE: "onboarding_complete",
} as const;

// ─── Recipe creation (URL 경로) ───
export const RecipeCreateEvents = {
  START_URL: "recipe_create_start_url",
  SUBMIT_URL: "recipe_create_submit_url",
  SUCCESS_URL: "recipe_create_success_url",
  FAIL_URL: "recipe_create_fail_url",
} as const;

// ─── Recipe enroll (북마크). 웹뷰 컨벤션: click → success/fail (북극성) ───
export const RecipeEnrollEvents = {
  CLICK: "recipe_enroll_click",
  SUCCESS: "recipe_enroll_success",
  FAIL: "recipe_enroll_fail",
} as const;

// ─── Recipe (카드 클릭/북마크 해제). UNENROLL은 네이티브 신규 ───
export const RecipeEvents = {
  USER_RECIPE_CLICK: "user_recipe_click",
  UNENROLL_BOOKMARK: "recipe_unenroll_bookmark",
} as const;

// ─── Recipe detail ───
export const RecipeDetailEvents = {
  VIEW: "recipe_detail_view",
  EXIT: "recipe_detail_exit",
  VIDEO_SEEK: "recipe_detail_video_seek",
  COOKING_START: "recipe_detail_cooking_start",
} as const;

// ─── Cooking mode (start / command / end) ───
export const CookingModeEvents = {
  START: "cooking_mode_start",
  COMMAND: "cooking_mode_command",
  END: "cooking_mode_end",
} as const;

// ─── Search ───
export const SearchEvents = {
  EXECUTED: "search_executed",
  RESULT_CLICK: "search_result_click",
  YOUTUBE_CLICK: "youtube_search_click",
} as const;

// ─── Category (나의 레시피 카테고리) ───
export const CategoryEvents = {
  SELECT: "user_category_select",
  CREATE_OPEN: "user_category_create_open",
  CREATE_SUCCESS: "user_category_create_success",
  DELETE_OPEN: "user_category_delete_open",
  DELETE_SUCCESS: "user_category_delete_success",
  MOVE_OPEN: "user_category_move_open",
  MOVE_SUCCESS: "user_category_move_success",
} as const;

// ─── Coupang (재료 구매 모달) ───
export const CoupangEvents = {
  PURCHASE_OPEN: "coupang_purchase_open",
  ITEM_CLICK: "coupang_item_click",
  PURCHASE_CLOSE: "coupang_purchase_close",
} as const;

// ─── Recharge (베리 충전) ───
export const RechargeEvents = {
  CLICK: "recharge_click",
  KAKAO_CLICK: "recharge_kakao_click",
} as const;

// ─── Theme (네이티브 신규) ───
export const ThemeEvents = {
  VIEW: "theme_view",
  FILTER_SELECT: "theme_filter_select",
  DISH_CLICK: "theme_dish_click",
} as const;

// ─── Recipe report (네이티브 신규) ───
export const ReportEvents = {
  OPEN: "recipe_report_open",
  SUBMIT: "recipe_report_submit",
} as const;

// ─── Contact (네이티브 신규) ───
export const ContactEvents = {
  KAKAO_CLICK: "contact_kakao_click",
} as const;

// ─── Account ───
export const AccountEvents = {
  WITHDRAWAL_START: "withdrawal_start",
  DELETE: "account_delete",
} as const;
