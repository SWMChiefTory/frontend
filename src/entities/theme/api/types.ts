/**
 * 테마 큐레이션 데이터 타입.
 *
 * - dish는 YouTube URL 기반 (recipe_id 의존성 X)
 * - 카드 표시는 thumbnail/title/channel/duration 만으로 가능
 * - 클릭 시 createRecipe 흐름으로 등록 → 상세 페이지 이동
 */

// ─── 태그 enum (Gemini 큐레이션과 동일) ───

/**
 * mood는 테마별로 다른 상황/시간 묘사 단어를 자유롭게 사용.
 * 예: "홈데이트", "노을 시간", "혼자 보는 영화", "퇴근길" 등
 * 운영 중 추가가 잦아 enum union 대신 string으로 둠.
 */
export type DishMood = string;

export type DishDifficulty = '초보' | '중급' | '상급';

export type DishTime = '10분' | '30분' | '1시간이상';

export type DishFormat = '쇼츠' | '숏폼' | '롱폼';

export type DishPairing =
  | '와인'
  | '맥주'
  | '소주'
  | '막걸리'
  | '하이볼'
  | '논알콜'
  | '없음';

export type DishOccasion =
  | '데이트'
  | '혼밥'
  | '홈파티'
  | '기념일'
  | '주말브런치'
  | '야식'
  | '도시락'
  | '평일저녁';

export type DishStyle =
  | '한식'
  | '양식'
  | '일식'
  | '중식'
  | '이탈리안'
  | '프렌치'
  | '퓨전'
  | '디저트';

export type DishIngredientFocus =
  | '고기'
  | '해산물'
  | '채소'
  | '면'
  | '밥'
  | '떡'
  | '빵'
  | '치즈'
  | '달걀';

export type DishBudget = '가성비' | '보통' | '프리미엄';

export interface DishTags {
  mood: DishMood[];
  difficulty: DishDifficulty;
  time: DishTime;
  format: DishFormat;
  pairing: DishPairing[];
  occasion: DishOccasion[];
  style: DishStyle[];
  ingredient_focus: DishIngredientFocus[];
  budget: DishBudget;
}

// ─── 카테고리 (mood와 별개의 분류 축) ───
//
// mood가 "분위기" 단어 자유 나열이라면, category는 "누구의 어떤 상황"인 명확한 큐레이션 분류.
// 사랑 한 끼 테마부터 도입. ThemeData.categories에 정의된 id만 dish.category에 들어갈 수 있음.

export type DishCategoryId = string;

export interface ThemeCategory {
  id: DishCategoryId;           // ex: "boyfriend", "girlfriend", "lunchbox"
  name: string;                 // 8자 이내 표시명. ex: "남친한테"
  emoji: string;                // ex: "💪"
  concept: string;              // 상단 설명문
  hook?: string;                // 카테고리 진입 시 토리 멘트
}

// ─── Dish (큐레이션 영상 단위) ───

export interface ThemeDish {
  id: string;                   // 클라이언트 키 (예: "love-1")
  title: string;
  channel: string;
  youtube_url: string;          // 핵심 — 클릭 시 등록 플로우
  video_id: string;             // youtube_url에서 추출 (썸네일 URL용)
  estimated_duration: string;
  tags: DishTags;
  why_recommended: string;
  is_curator_pick?: boolean;
  hook?: string;                // 큐레이터 한 줄 카피 (있을 때만 카드에 노출)
  recipe_id?: string;           // 등록된 레시피 ID (있으면 카드 클릭 시 detail로 이동)
  category?: DishCategoryId;    // 신규: 카테고리 큐레이션 분류 축
  thumbnail?: string;           // 신규: oEmbed로 받아온 실제 썸네일 URL (없으면 video_id 기반 fallback)
  dish_name?: string;           // 신규: 짧은 요리명 (4~8자, 카드 이미지 오버레이용)
  failed?: boolean;             // 신규: 서버에서 RECIPE_008 등으로 처리 실패한 dish (UI에서 자동 필터링)
}

// ─── Theme ───

export interface ThemeData {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  mode: 'light' | 'dark';
  curator_quote?: string;       // "처음 만드는 데이트 요리부터..."
  categories?: ThemeCategory[]; // 신규: 카테고리 정의 (있으면 category 모달 사용)
  dishes: ThemeDish[];
}

// ─── 헬퍼 ───

/**
 * YouTube videoId로부터 썸네일 URL 생성.
 * maxres가 없는 영상도 있어서 hqdefault가 안전.
 */
export function youtubeThumbnailUrl(
  videoId: string,
  quality: 'maxres' | 'hq' | 'mq' = 'hq',
): string {
  const map = {
    maxres: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${map[quality]}.jpg`;
}

/**
 * YouTube URL에서 videoId 추출.
 */
export function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1];
  }
  return null;
}
