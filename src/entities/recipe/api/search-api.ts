import { z } from 'zod';
import { client } from '@/src/shared/api';

// ─── Raw schemas ─────────────────────────────────────────────────

const RawAutocompleteItemSchema = z
  .object({
    autocomplete: z.string().nullish(),
  })
  .passthrough();

const RawAutocompleteResponseSchema = z
  .object({
    autocompletes: z.array(RawAutocompleteItemSchema).default([]),
  })
  .passthrough();

const RawSearchHistoryItemSchema = z
  .object({
    history: z.string().nullish(),
  })
  .passthrough();

const RawSearchHistoriesResponseSchema = z
  .object({
    recipe_search_histories: z.array(RawSearchHistoryItemSchema).default([]),
  })
  .passthrough();

const RawSearchedRecipeSchema = z
  .object({
    recipe_id: z.string(),
    recipe_title: z.string(),
    video_thumbnail_url: z.string().nullish(),
    video_type: z.enum(['SHORTS', 'NORMAL']).nullish(),
    channel_title: z.string().nullish(),
    cook_time: z.number().nullish(),
    cooking_time: z.number().nullish(),
    servings: z.number().nullish(),
  })
  .passthrough();

const RawSearchResponseSchema = z
  .object({
    searched_recipes: z.array(RawSearchedRecipeSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  })
  .passthrough();

type RawSearchedRecipe = z.infer<typeof RawSearchedRecipeSchema>;

// ─── Client types ────────────────────────────────────────────────

export interface AutocompleteItem {
  text: string;
}

export interface SearchHistory {
  text: string;
}

export interface SearchedRecipe {
  recipeId: string;
  recipeTitle: string;
  videoThumbnailUrl: string;
  videoType: 'SHORTS' | 'NORMAL';
  channelTitle: string;
  cookingTime: number;
  servings: number;
}

export interface SearchResultPage {
  data: SearchedRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}

// ─── Transformers ────────────────────────────────────────────────

function toSearchedRecipe(raw: RawSearchedRecipe): SearchedRecipe {
  return {
    recipeId: raw.recipe_id,
    recipeTitle: raw.recipe_title,
    videoThumbnailUrl: raw.video_thumbnail_url ?? '',
    videoType: raw.video_type ?? 'NORMAL',
    channelTitle: raw.channel_title ?? '',
    cookingTime: raw.cook_time ?? raw.cooking_time ?? 0,
    servings: raw.servings ?? 0,
  };
}

// ─── APIs ────────────────────────────────────────────────────────

export async function fetchAutocomplete(query: string): Promise<AutocompleteItem[]> {
  try {
    const res = await client.get('/search/autocomplete', { params: { query, scope: 'RECIPE' } });
    const parsed = RawAutocompleteResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[SearchAPI] autocomplete schema error:', parsed.error.issues);
      return [];
    }
    return parsed.data.autocompletes
      .map((i) => ({ text: i.autocomplete ?? '' }))
      .filter((i) => i.text.length > 0);
  } catch {
    return [];
  }
}

export async function fetchSearchHistories(): Promise<SearchHistory[]> {
  try {
    const res = await client.get('/search/histories', { params: { scope: 'RECIPE' } });
    const parsed = RawSearchHistoriesResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[SearchAPI] histories schema error:', parsed.error.issues);
      return [];
    }
    return parsed.data.recipe_search_histories
      .map((i) => ({ text: i.history ?? '' }))
      .filter((i) => i.text.length > 0);
  } catch {
    return [];
  }
}

export async function deleteSearchHistory(text: string): Promise<void> {
  await client.delete('/search/histories', { params: { text, scope: 'RECIPE' } });
}

export async function deleteAllSearchHistories(): Promise<void> {
  await client.delete('/search/histories', { params: { scope: 'RECIPE' } });
}

export async function searchRecipes(
  query: string,
  cursor?: string | null,
): Promise<SearchResultPage> {
  try {
    const res = await client.get('/recipes/search', {
      params: { query, ...(cursor ? { cursor } : {}) },
    });
    const parsed = RawSearchResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn('[SearchAPI] search schema error:', parsed.error.issues);
      return { data: [], nextCursor: null, hasNext: false };
    }
    return {
      data: parsed.data.searched_recipes.map(toSearchedRecipe),
      nextCursor: parsed.data.next_cursor ?? null,
      hasNext: parsed.data.has_next ?? false,
    };
  } catch {
    return { data: [], nextCursor: null, hasNext: false };
  }
}
