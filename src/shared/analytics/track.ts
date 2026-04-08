import { track as amplitudeTrack } from "@amplitude/analytics-react-native";
import { Platform } from "react-native";
import {
  AccountEvents,
  AppEvents,
  AuthEvents,
  CategoryEvents,
  ContactEvents,
  CookingModeEvents,
  CoupangEvents,
  OnboardingEvents,
  RechargeEvents,
  RecipeCreateEvents,
  RecipeDetailEvents,
  RecipeEnrollEvents,
  RecipeEvents,
  ReportEvents,
  SearchEvents,
  ThemeEvents,
} from "./events";

/**
 * 모든 이벤트명을 합친 union — track()의 첫 인자 타입.
 * 새 이벤트는 events.ts에 추가하면 자동으로 여기 포함됨.
 */
export type AmplitudeEventName =
  | (typeof AppEvents)[keyof typeof AppEvents]
  | (typeof AuthEvents)[keyof typeof AuthEvents]
  | (typeof OnboardingEvents)[keyof typeof OnboardingEvents]
  | (typeof RecipeCreateEvents)[keyof typeof RecipeCreateEvents]
  | (typeof RecipeEnrollEvents)[keyof typeof RecipeEnrollEvents]
  | (typeof RecipeEvents)[keyof typeof RecipeEvents]
  | (typeof RecipeDetailEvents)[keyof typeof RecipeDetailEvents]
  | (typeof CookingModeEvents)[keyof typeof CookingModeEvents]
  | (typeof SearchEvents)[keyof typeof SearchEvents]
  | (typeof CategoryEvents)[keyof typeof CategoryEvents]
  | (typeof CoupangEvents)[keyof typeof CoupangEvents]
  | (typeof RechargeEvents)[keyof typeof RechargeEvents]
  | (typeof ThemeEvents)[keyof typeof ThemeEvents]
  | (typeof ReportEvents)[keyof typeof ReportEvents]
  | (typeof ContactEvents)[keyof typeof ContactEvents]
  | (typeof AccountEvents)[keyof typeof AccountEvents];

/**
 * 이벤트별 프로퍼티 타입 매핑.
 * 웹뷰(`webview-v2`)와 동일한 이름/타입을 유지 → funnel 공유.
 */
export interface EventPropsMap {
  // ─── Auth (네이티브 전용) ───
  [AuthEvents.LOGIN_SUCCESS]: { provider: string };
  [AuthEvents.SIGNUP_SUCCESS]: { provider: string };
  [AuthEvents.LOGOUT]: never;

  // ─── Recipe creation (URL) ───
  [RecipeCreateEvents.START_URL]: {
    entry_point: "home" | "external_share" | "deep_link" | "floating_button";
    has_prefilled_url: boolean;
    is_from_share: boolean;
  };
  [RecipeCreateEvents.SUBMIT_URL]: {
    entry_point: "home" | "external_share" | "deep_link" | "floating_button";
    has_target_category: boolean;
    target_category_id?: string;
    video_url: string;
    video_id?: string;
  };
  [RecipeCreateEvents.SUCCESS_URL]: {
    entry_point: "home" | "external_share" | "deep_link" | "floating_button";
    recipe_id: string;
    has_target_category: boolean;
    video_url: string;
    video_id?: string;
  };
  [RecipeCreateEvents.FAIL_URL]: {
    entry_point: "home" | "external_share" | "deep_link" | "floating_button";
    error_type: string;
    error_message: string;
    video_url: string;
    video_id?: string;
  };

  // ─── Recipe enroll (북마크) ───
  [RecipeEnrollEvents.CLICK]: {
    recipe_id: string;
    source: "floating_button" | "step_unlock_button" | string;
  };
  [RecipeEnrollEvents.SUCCESS]: {
    recipe_id: string;
    source: "floating_button" | "step_unlock_button" | string;
  };
  [RecipeEnrollEvents.FAIL]: {
    recipe_id: string;
    source: "floating_button" | "step_unlock_button" | string;
    error_code?: string;
  };

  // ─── Recipe (카드 클릭/해제) ───
  [RecipeEvents.USER_RECIPE_CLICK]: {
    source: "home" | "user_recipe" | "bookmark";
    recipe_id: string;
    recipe_title?: string;
    video_type?: string;
  };
  [RecipeEvents.UNENROLL_BOOKMARK]: { recipe_id: string };

  // ─── Recipe detail ───
  [RecipeDetailEvents.VIEW]: {
    recipe_id: string;
    recipe_title?: string;
    is_first_view?: boolean;
    total_steps?: number;
    total_details?: number;
    total_ingredients?: number;
    has_video?: boolean;
  };
  [RecipeDetailEvents.EXIT]: {
    recipe_id: string;
    stay_duration: number; // 초 단위
    tab_switch_count?: number;
    final_tab?: string;
    reached_cooking_start?: boolean;
  };
  [RecipeDetailEvents.VIDEO_SEEK]: {
    recipe_id: string;
    video_time?: number; // 웹뷰와 동일 키 (호환성)
    step_order?: number;
    step_title?: string;
    detail_index?: number;
  };
  [RecipeDetailEvents.COOKING_START]: {
    recipe_id: string;
    time_to_start?: number; // 초 단위
    tab_switch_count?: number;
    ingredient_prepared_count?: number;
  };

  // ─── Cooking mode ───
  [CookingModeEvents.START]: {
    recipe_id: string;
    total_steps: number;
    total_details: number;
  };
  [CookingModeEvents.COMMAND]: {
    recipe_id: string;
    command_type: "navigation" | "video_control" | "timer" | "info";
    command_detail: string;
    trigger_method: "voice" | "touch";
    current_step: number;
    current_detail: number;
  };
  [CookingModeEvents.END]: {
    recipe_id: string;
    duration_seconds: number;
    total_steps: number;
    visited_steps_unique?: number;
    step_completion_rate?: number;
    voice_command_count?: number;
    touch_command_count?: number;
    command_count?: number;
    last_step_index?: number;
  };

  // ─── Search ───
  [SearchEvents.EXECUTED]: {
    keyword: string;
    search_method: "direct" | "recent" | "popular" | "autocomplete";
  };
  [SearchEvents.RESULT_CLICK]: {
    keyword: string;
    position: number;
    recipe_id: string;
    is_registered?: boolean;
    video_type?: string;
  };
  [SearchEvents.YOUTUBE_CLICK]: {
    keyword: string;
    source: string;
  };

  // ─── Category ───
  [CategoryEvents.SELECT]: {
    source: "home" | "user_recipe" | "bookmark";
    category_id: string;
    category_name?: string;
  };
  [CategoryEvents.CREATE_OPEN]: never;
  [CategoryEvents.CREATE_SUCCESS]: { category_name: string };
  [CategoryEvents.DELETE_OPEN]: {
    category_id: string;
    category_name: string;
  };
  [CategoryEvents.DELETE_SUCCESS]: {
    category_id: string;
    category_name: string;
    recipe_count: number;
  };
  [CategoryEvents.MOVE_OPEN]: { recipe_id: string };
  [CategoryEvents.MOVE_SUCCESS]: {
    recipe_id: string;
    target_category_id: string;
    target_category_name: string;
  };

  // ─── Coupang ───
  [CoupangEvents.PURCHASE_OPEN]: {
    recipe_id: string;
    ingredient_count: number;
  };
  [CoupangEvents.ITEM_CLICK]: {
    recipe_id: string;
    ingredient_name?: string;
    product_id: string;
    product_name?: string;
    price?: number;
    is_rocket?: boolean;
    position?: number;
  };
  [CoupangEvents.PURCHASE_CLOSE]: {
    recipe_id: string;
    products_displayed: number;
    products_clicked: number;
    clicked_products?: string[];
    duration_seconds: number;
  };

  // ─── Recharge ───
  [RechargeEvents.CLICK]: {
    source: "home_header" | "settings" | "create_modal";
  };
  [RechargeEvents.KAKAO_CLICK]: never;

  // ─── Theme (네이티브 신규) ───
  [ThemeEvents.VIEW]: { theme_id: string };
  [ThemeEvents.FILTER_SELECT]: { theme_id: string; filter: string };
  [ThemeEvents.DISH_CLICK]: { theme_id: string; dish_name: string };

  // ─── Report (네이티브 신규) ───
  [ReportEvents.OPEN]: { recipe_id: string };
  [ReportEvents.SUBMIT]: {
    recipe_id: string;
    reason: string;
    description?: string;
  };

  // ─── Contact (네이티브 신규) ───
  [ContactEvents.KAKAO_CLICK]: { source: string };

  // ─── Account ───
  [AccountEvents.WITHDRAWAL_START]: never;
  [AccountEvents.DELETE]: {
    reasons: string[];
    feedback_count: number;
  };

  // ─── App / Onboarding (props 없음) ───
  [AppEvents.LAUNCHED]: never;
  [OnboardingEvents.START]: never;
  [OnboardingEvents.SKIP]: never;
  [OnboardingEvents.COMPLETE]: never;
}

type PropsOf<E extends AmplitudeEventName> = E extends keyof EventPropsMap
  ? EventPropsMap[E] extends never
    ? []
    : [props: EventPropsMap[E]]
  : [props?: Record<string, unknown>];

/**
 * 타입 안전 Amplitude 이벤트 추적.
 *
 * - 이벤트명은 events.ts의 namespace 상수만 허용
 * - 프로퍼티는 EventPropsMap에 정의된 모양으로 강제 (누락 시 컴파일 에러)
 * - source/platform 메타는 자동 부착
 */
export function track<E extends AmplitudeEventName>(
  event: E,
  ...args: PropsOf<E>
): void {
  const props = (args[0] ?? {}) as Record<string, unknown>;
  if (__DEV__) console.log("[track]", event, props);
  amplitudeTrack(event, {
    ...props,
    source: "native",
    platform: Platform.OS,
  });
}
