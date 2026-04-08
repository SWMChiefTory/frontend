// 이벤트 이름 enum - 필요할 때 추가
export enum AmplitudeEvent {
  // Native - 앱 라이프사이클
  APP_LAUNCHED = "app_launched",

  // Native - 인증
  LOGIN_SUCCESS = "login_success",   // 기존 유저 로그인
  SIGNUP_SUCCESS = "signup_success", // 신규 유저 회원가입
  LOGOUT = "logout",

  // Native - 온보딩
  ONBOARDING_START = "onboarding_start",
  ONBOARDING_SKIP = "onboarding_skip",
  ONBOARDING_COMPLETE = "onboarding_complete",

  // 필요할 때 계속 추가...
}
