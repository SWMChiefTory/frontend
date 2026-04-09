/**
 * Mood 라벨 → 이미지 매핑.
 *
 * 새 mood 추가/변경 시 이 파일에서 한 곳만 수정.
 * 매칭 안 되는 mood는 null 반환 → UI에서 텍스트만 표시.
 */

const MOOD_IMAGES: Record<string, number> = {
  // ─── 사랑 한 끼 ───
  '홈데이트': require('@/assets/images/moods/mood-love-pajama.png'),
  '노을 시간': require('@/assets/images/moods/mood-love-sunset.png'),
  '기념일 저녁': require('@/assets/images/moods/mood-love-anniversary.png'),
  '오늘 너랑': require('@/assets/images/moods/mood-love-with-you.png'),
  '와인 한 잔': require('@/assets/images/moods/mood-love-wine.png'),
  '주말 브런치': require('@/assets/images/moods/mood-love-lunch.png'),
  '점심': require('@/assets/images/moods/mood-love-lunch.png'),

  // ─── 버터떡 ───
  '홈카페': require('@/assets/images/moods/mood-butter-homecafe.png'),
  '티타임': require('@/assets/images/moods/mood-butter-teatime.png'),
  '간식 시간': require('@/assets/images/moods/mood-butter-snack.png'),
  '달콤한 휴식': require('@/assets/images/moods/mood-butter-sweetbreak.png'),
  '오후 3시': require('@/assets/images/moods/mood-butter-3pm.png'),
  '한 입 쉼표': require('@/assets/images/moods/mood-butter-bite.png'),

  // ─── 봄동 비빔밥 ───
  '봄 한 그릇': require('@/assets/images/moods/mood-bomdong-spring.png'),
  '엄마 손맛': require('@/assets/images/moods/mood-bomdong-mom.png'),
  '제철 한 상': require('@/assets/images/moods/mood-bomdong-seasonal.png'),
  '늦은 점심': require('@/assets/images/moods/mood-bomdong-lunch.png'),
  '소박한 한 끼': require('@/assets/images/moods/mood-bomdong-simple.png'),
  '평일 저녁': require('@/assets/images/moods/mood-bomdong-weeknight.png'),

  // ─── 밤에 땡기는 ───
  '혼자 보는 영화': require('@/assets/images/moods/mood-night-movie.png'),
  '퇴근길': require('@/assets/images/moods/mood-night-commute.png'),
  '이불 속': require('@/assets/images/moods/mood-night-blanket.png'),
  '혼술 한 잔': require('@/assets/images/moods/mood-night-beer.png'),
  '새벽 한 시': require('@/assets/images/moods/mood-night-1am.png'),
  '주말 밤': require('@/assets/images/moods/mood-night-weekend.png'),
};

export function getMoodImage(mood: string): number | null {
  return MOOD_IMAGES[mood] ?? null;
}
