import { z } from 'zod';
import { parseOrNull } from '@/src/shared/api';
import type { ThemeData, ThemeDish, DishTags, ThemeCategory } from './types';
import { extractYoutubeVideoId } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const themesJson = require('@/assets/data/themes.json');

// 개발 중 데이터 변경 시 hot reload에서도 즉시 반영되도록 캐시 비활성.
// 데이터가 안정화되면 다시 모듈 캐시 도입 가능.
let cachedThemes: ThemeData[] | null = null;
if (__DEV__) cachedThemes = null;

// ─── Raw schema (JSON 그대로) ───

const RawDishTagsSchema = z
  .object({
    mood: z.array(z.string()).default([]),
    difficulty: z.string(),
    time: z.string(),
    format: z.string(),
    pairing: z.array(z.string()).default([]),
    occasion: z.array(z.string()).default([]),
    style: z.array(z.string()).default([]),
    ingredient_focus: z.array(z.string()).default([]),
    budget: z.string(),
  });

const RawThemeDishSchema = z
  .object({
    id: z.string().optional(),
    title: z.string(),
    channel: z.string().default(''),
    youtube_url: z.string(),
    estimated_duration: z.string().default(''),
    tags: RawDishTagsSchema,
    why_recommended: z.string().default(''),
    is_curator_pick: z.boolean().optional(),
    hook: z.string().optional(),
    recipe_id: z.string().optional(),
    category: z.string().optional(),
    thumbnail: z.string().optional(),
    dish_name: z.string().optional(),
    failed: z.boolean().optional(),
  });

const RawThemeCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    emoji: z.string().default(''),
    concept: z.string().default(''),
    hook: z.string().optional(),
  });

const RawThemeSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().default(''),
    color: z.string().default('#C4632B'),
    mode: z.enum(['light', 'dark']).default('light'),
    curator_quote: z.string().optional(),
    categories: z.array(RawThemeCategorySchema).optional(),
    dishes: z.array(RawThemeDishSchema).default([]),
  });

const RawThemesResponseSchema = z
  .object({
    themes: z.array(RawThemeSchema).default([]),
  });

// ─── Transformer ───

import { useMarketStore } from '@/src/shared/store/marketStore';

function isGlobal(): boolean {
  return useMarketStore.getState().market === 'GLOBAL';
}

function toThemeDish(raw: z.infer<typeof RawThemeDishSchema>, idx: number): ThemeDish | null {
  // 서버에서 처리 실패(RECIPE_008 등) 표시된 dish는 UI에서 제외
  if (raw.failed) return null;
  const videoId = extractYoutubeVideoId(raw.youtube_url);
  if (!videoId) {
    console.warn('[ThemeAPI] invalid youtube_url, skip:', raw.youtube_url);
    return null;
  }
  const en = isGlobal();
  return {
    id: raw.id ?? `dish-${videoId}-${idx}`,
    title: raw.title,
    channel: raw.channel,
    youtube_url: raw.youtube_url,
    video_id: videoId,
    estimated_duration: raw.estimated_duration,
    tags: raw.tags as DishTags,
    why_recommended: (en ? (raw as any).why_recommended_en : null) ?? raw.why_recommended,
    is_curator_pick: raw.is_curator_pick ?? false,
    hook: (en ? (raw as any).hook_en : null) ?? raw.hook,
    recipe_id: raw.recipe_id,
    category: raw.category,
    thumbnail: raw.thumbnail,
    dish_name: (en ? (raw as any).dish_name_en : null) ?? raw.dish_name,
    failed: raw.failed,
  };
}

function toTheme(raw: z.infer<typeof RawThemeSchema>): ThemeData {
  const en = isGlobal();
  const cats = raw.categories?.map(c => ({
    ...(c as ThemeCategory),
    name: (en ? (c as any).name_en : null) ?? c.name,
    concept: (en ? (c as any).concept_en : null) ?? c.concept,
  }));
  return {
    id: raw.id,
    title: (en ? (raw as any).title_en : null) ?? raw.title,
    subtitle: (en ? (raw as any).subtitle_en : null) ?? raw.subtitle,
    color: raw.color,
    mode: raw.mode,
    curator_quote: (en ? (raw as any).curator_quote_en : null) ?? raw.curator_quote,
    categories: cats as ThemeCategory[] | undefined,
    dishes: raw.dishes
      .map((d, i) => toThemeDish(d, i))
      .filter((d): d is ThemeDish => d !== null),
  };
}

// ─── API ───

let cachedMarketKey: string | null = null;

export async function fetchThemes(): Promise<ThemeData[]> {
  const currentMarket = useMarketStore.getState().market ?? 'KOREA';

  // GLOBAL(영어)에서는 한국 유튜브 큐레이션 미노출
  if (currentMarket === 'GLOBAL') return [];

  // 언어가 바뀌면 캐시 무효화 (번역 필드 다르게 매핑해야 하므로)
  if (cachedMarketKey !== currentMarket) {
    cachedThemes = null;
    cachedMarketKey = currentMarket;
  }
  if (!__DEV__ && cachedThemes) return cachedThemes;

  const parsed = parseOrNull(RawThemesResponseSchema, themesJson, 'ThemeAPI');
  if (!parsed) return [];
  const themes = parsed.themes.map(toTheme);
  if (!__DEV__) cachedThemes = themes;
  console.log('[ThemeAPI] loaded themes:', themes.map(t => ({
    id: t.id,
    categories: t.categories?.length ?? 0,
    dishes: t.dishes.length,
  })));
  return themes;
}

export async function fetchThemeById(id: string): Promise<ThemeData | null> {
  const themes = await fetchThemes();
  return themes.find((t) => t.id === id) ?? null;
}
