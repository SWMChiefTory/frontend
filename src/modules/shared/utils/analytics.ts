// Firebase Analytics 제거 — Amplitude로 대체 예정
// 기존 track API 유지 (no-op)

export const track = {
  screen: (_name: string) => {},
  event: (_name: string, _params?: Record<string, any>) => {},
  userProp: (_name: string, _value: string) => {},
};
