/**
 * 디자인 토큰 — 새 디자인 시스템 (v2)
 *
 * Primary: #FF7300 (따뜻한 오렌지)
 * 폰트: 제목 한수원 한돋움 / 본문 Pretendard
 * 스타일: 둥글게, 그림자 최소
 */

export const colors = {
  primary: '#FF7300',
  primaryLight: '#FFF0E0',
  primaryDark: '#E56600',

  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',

  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    disabled: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  semantic: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
  },

  card: {
    recipe: '#FF7300',
    fridge: '#2DB89A',
    calendar: '#8B6FC0',
  },

  tab: {
    active: '#FF7300',
    inactive: '#9CA3AF',
  },
} as const;

export const typography = {
  heading: {
    fontFamily: 'HanSuWonHanDotUm',
    h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
    h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  },
  body: {
    fontFamily: 'Pretendard',
    large: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    medium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  },
  label: {
    fontFamily: 'Pretendard',
    large: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
    medium: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
    small: { fontSize: 10, fontWeight: '600' as const, lineHeight: 14 },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
