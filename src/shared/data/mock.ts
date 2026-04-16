/**
 * 목데이터 — 개발/프로토타입용
 */

export type ThemeCard = {
  id: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
  image?: any;
}

export type RecipeCard = {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  views: string;
  description?: string;
  servings?: number;
  cookingTime?: number;
  recipeStatus?: string;
}

export type Category = {
  id: string;
  name: string;
}

export const MOCK_THEME_CARDS: ThemeCard[] = [
  { id: 'dubai-cookie', title: '두바이 쫀득 쿠키', subtitle: '트렌드 디저트의 정석', backgroundColor: '#8B5A3C', image: require('@/assets/images/theme-dubai-chocolate.png') },
  { id: 'butter-tteok', title: '버터떡', subtitle: '바삭한 한입 간식', backgroundColor: '#B39B65', image: require('@/assets/images/theme-butter-tteok.png') },
  { id: 'bomdong', title: '봄동 비빔밥', subtitle: '제철 봄나물 요리', backgroundColor: '#5E8E6E', image: require('@/assets/images/theme-bomdong.png') },
  { id: 'night-snack', title: '밤에 땡기는', subtitle: '야식 타임', backgroundColor: '#5A6275', image: require('@/assets/images/theme-night-snack.png') },
  { id: 'love-meal', title: '사랑 한 끼', subtitle: '연인 요리', backgroundColor: '#9E6B6B', image: require('@/assets/images/theme-love-meal.png') },
];

export const MOCK_HOT_RECIPES: RecipeCard[] = [
  { id: '1', title: '두바이 쫀득 쿠키', thumbnailUrl: 'https://picsum.photos/seed/recipe1/300/200', duration: '25분', views: '1.2만' },
  { id: '2', title: '크림 버터떡', thumbnailUrl: 'https://picsum.photos/seed/recipe2/300/200', duration: '15분', views: '8,432' },
  { id: '3', title: '봄동 겉절이', thumbnailUrl: 'https://picsum.photos/seed/recipe3/300/200', duration: '10분', views: '5,621' },
  { id: '4', title: '마늘 간장 치킨', thumbnailUrl: 'https://picsum.photos/seed/recipe4/300/200', duration: '40분', views: '2.3만' },
  { id: '5', title: '크림 파스타', thumbnailUrl: 'https://picsum.photos/seed/recipe5/300/200', duration: '20분', views: '1.8만' },
];

export const MOCK_RECENT_RECIPES: RecipeCard[] = [
  { id: '6', title: '된장찌개', thumbnailUrl: 'https://picsum.photos/seed/recent1/300/200', duration: '30분', views: '3,210' },
  { id: '7', title: '김치볶음밥', thumbnailUrl: 'https://picsum.photos/seed/recent2/300/200', duration: '15분', views: '7,891' },
  { id: '8', title: '계란말이', thumbnailUrl: 'https://picsum.photos/seed/recent3/300/200', duration: '10분', views: '4,567' },
  { id: '9', title: '떡볶이', thumbnailUrl: 'https://picsum.photos/seed/recent4/300/200', duration: '20분', views: '9,012' },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'all', name: '전체' },
  { id: 'korean', name: '한식' },
  { id: 'western', name: '양식' },
  { id: 'chinese', name: '중식' },
  { id: 'japanese', name: '일식' },
  { id: 'dessert', name: '디저트' },
];

export const MOCK_MY_RECIPES: RecipeCard[] = [
  { id: '10', title: '김치찌개', thumbnailUrl: 'https://picsum.photos/seed/my1/300/200', duration: '25분', views: '저장됨' },
  { id: '11', title: '불고기', thumbnailUrl: 'https://picsum.photos/seed/my2/300/200', duration: '35분', views: '저장됨' },
  { id: '12', title: '파스타', thumbnailUrl: 'https://picsum.photos/seed/my3/300/200', duration: '20분', views: '저장됨' },
  { id: '13', title: '샐러드', thumbnailUrl: 'https://picsum.photos/seed/my4/300/200', duration: '10분', views: '저장됨' },
  { id: '14', title: '스테이크', thumbnailUrl: 'https://picsum.photos/seed/my5/300/200', duration: '30분', views: '저장됨' },
  { id: '15', title: '초밥', thumbnailUrl: 'https://picsum.photos/seed/my6/300/200', duration: '45분', views: '저장됨' },
];

export const MOCK_BERRY_BALANCE = 32;
