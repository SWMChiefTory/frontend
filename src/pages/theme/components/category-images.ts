/**
 * 카테고리 커버 이미지 매핑.
 * `{themeId}:{categoryId}` 키로 이미지 require.
 *
 * 새 이미지 추가 시 이 파일에 한 줄만 추가하면 된다.
 */

const IMAGES: Record<string, ReturnType<typeof require>> = {
  // 사랑 한 끼
  'love-meal:boyfriend':     require('@/assets/images/categories/love-meal/boyfriend.png'),
  'love-meal:girlfriend':    require('@/assets/images/categories/love-meal/girlfriend.png'),
  'love-meal:first-date':    require('@/assets/images/categories/love-meal/first-date.png'),
  'love-meal:home-invite':   require('@/assets/images/categories/love-meal/home-invite.png'),
  'love-meal:cook-together': require('@/assets/images/categories/love-meal/cook-together.png'),
  'love-meal:lunchbox':      require('@/assets/images/categories/love-meal/lunchbox.png'),

  // 야식
  'night-snack:quick-3':     require('@/assets/images/categories/night-snack/quick-3.png'),
  'night-snack:guilt-free':  require('@/assets/images/categories/night-snack/guilt-free.png'),
  'night-snack:ramen-mod':   require('@/assets/images/categories/night-snack/ramen-mod.png'),
  'night-snack:cvs-combo':   require('@/assets/images/categories/night-snack/cvs-combo.png'),
  'night-snack:guilty':      require('@/assets/images/categories/night-snack/guilty.png'),
};

export function getCategoryImage(themeId: string, categoryId: string) {
  return IMAGES[`${themeId}:${categoryId}`] ?? null;
}
