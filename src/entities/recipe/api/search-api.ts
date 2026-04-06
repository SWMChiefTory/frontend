import { client } from '@/src/modules/shared/api/client';

export interface AutocompleteItem {
  text: string;
}

export interface SearchHistory {
  text: string;
}

export async function fetchAutocomplete(query: string): Promise<AutocompleteItem[]> {
  try {
    const res = await client.get('/search/autocomplete', { params: { query, scope: 'RECIPE' } });
    const items = res.data?.autocompletes ?? [];
    return items.map((i: any) => ({ text: i.autocomplete ?? i.text ?? '' }));
  } catch {
    return [];
  }
}

export async function fetchSearchHistories(): Promise<SearchHistory[]> {
  try {
    const res = await client.get('/search/histories', { params: { scope: 'RECIPE' } });
    const items = res.data?.recipeSearchHistories ?? res.data?.recipe_search_histories ?? [];
    return items.map((i: any) => ({ text: i.history ?? i.text ?? '' }));
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

export interface SearchedRecipe {
  recipeId: string;
  recipeTitle: string;
  videoThumbnailUrl: string;
  videoType: 'SHORTS' | 'NORMAL';
  channelTitle: string;
  cookingTime: number;
  servings: number;
}

export async function searchRecipes(query: string, cursor?: string | null): Promise<{
  data: SearchedRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}> {
  try {
    const res = await client.get('/recipes/search', { params: { query, ...(cursor ? { cursor } : {}) } });
    const raw = res.data;
    const recipes = raw.searched_recipes ?? raw.recipes ?? raw.data ?? [];
    return {
      nextCursor: raw.next_cursor ?? raw.nextCursor ?? null,
      hasNext: raw.has_next ?? raw.hasNext ?? false,
      data: recipes.map((r: any) => ({
        recipeId: r.recipe_id ?? r.recipeId ?? '',
        recipeTitle: r.recipe_title ?? r.recipeTitle ?? '',
        videoThumbnailUrl: r.video_thumbnail_url ?? r.videoThumbnailUrl ?? '',
        videoType: r.video_type ?? r.videoType ?? 'NORMAL',
        channelTitle: r.channel_title ?? r.channelTitle ?? '',
        cookingTime: r.cooking_time ?? r.cookingTime ?? r.cook_time ?? 0,
        servings: r.servings ?? 0,
      })),
    };
  } catch {
    return { data: [], nextCursor: null, hasNext: false };
  }
}
