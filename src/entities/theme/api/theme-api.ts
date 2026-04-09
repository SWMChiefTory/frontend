import { z } from 'zod';
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
  })
  .passthrough();

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
  })
  .passthrough();

const RawThemeCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    emoji: z.string().default(''),
    concept: z.string().default(''),
    hook: z.string().optional(),
  })
  .passthrough();

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
  })
  .passthrough();

const RawThemesResponseSchema = z
  .object({
    themes: z.array(RawThemeSchema).default([]),
  })
  .passthrough();

// ─── Transformer ───

function toThemeDish(raw: z.infer<typeof RawThemeDishSchema>, idx: number): ThemeDish | null {
  // 서버에서 처리 실패(RECIPE_008 등) 표시된 dish는 UI에서 제외
  if (raw.failed) return null;
  const videoId = extractYoutubeVideoId(raw.youtube_url);
  if (!videoId) {
    console.warn('[ThemeAPI] invalid youtube_url, skip:', raw.youtube_url);
    return null;
  }
  return {
    id: raw.id ?? `dish-${videoId}-${idx}`,
    title: raw.title,
    channel: raw.channel,
    youtube_url: raw.youtube_url,
    video_id: videoId,
    estimated_duration: raw.estimated_duration,
    tags: raw.tags as DishTags,
    why_recommended: raw.why_recommended,
    is_curator_pick: raw.is_curator_pick ?? false,
    hook: raw.hook,
    recipe_id: raw.recipe_id,
    category: raw.category,
    thumbnail: raw.thumbnail,
    dish_name: raw.dish_name,
    failed: raw.failed,
  };
}

function toTheme(raw: z.infer<typeof RawThemeSchema>): ThemeData {
  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle,
    color: raw.color,
    mode: raw.mode,
    curator_quote: raw.curator_quote,
    categories: raw.categories as ThemeCategory[] | undefined,
    dishes: raw.dishes
      .map((d, i) => toThemeDish(d, i))
      .filter((d): d is ThemeDish => d !== null),
  };
}

// ─── API ───

export async function fetchThemes(): Promise<ThemeData[]> {
  if (!__DEV__ && cachedThemes) return cachedThemes;

  const parsed = RawThemesResponseSchema.safeParse(themesJson);
  if (!parsed.success) {
    console.warn('[ThemeAPI] schema error:', JSON.stringify(parsed.error.issues, null, 2));
    return [];
  }
  const themes = parsed.data.themes.map(toTheme);
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
