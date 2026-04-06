import { client } from '@/src/modules/shared/api/client';

export enum RecommendType {
  CHEF = 'CHEF',
  TRENDING = 'TRENDING',
  POPULAR = 'POPULAR',
}

export interface RecommendRecipe {
  recipeId: string;
  recipeTitle: string;
  videoThumbnailUrl: string;
  videoSeconds: number;
  channelTitle: string;
  cookingTime: number;
  servings: number;
  description: string;
  creditCost: number;
}

export async function fetchRecommendRecipes(
  recommendType: RecommendType,
  cursor?: string | null,
): Promise<{ data: RecommendRecipe[]; nextCursor: string | null; hasNext: boolean }> {
  try {
    const res = await client.get(`/recipes/recommend/${recommendType}`, {
      params: { query: 'ALL' },
    });

    const raw = res.data;
    // API 응답이 snake_case
    const recipes = raw.recommend_recipes ?? raw.recommendRecipes ?? [];

    return {
      nextCursor: raw.next_cursor ?? raw.nextCursor ?? null,
      hasNext: raw.has_next ?? raw.hasNext ?? false,
      data: recipes.map((item: any) => ({
        recipeId: item.recipe_id ?? item.recipeId ?? '',
        recipeTitle: item.recipe_title ?? item.recipeTitle ?? '',
        videoThumbnailUrl: item.video_thumbnail_url ?? item.videoThumbnailUrl ?? '',
        videoSeconds: item.video_seconds ?? item.videoSeconds ?? 0,
        channelTitle: item.channel_title ?? item.channelTitle ?? '',
        cookingTime: item.cooking_time ?? item.cookingTime ?? 0,
        servings: item.servings ?? 0,
        description: item.description ?? '',
        creditCost: item.credit_cost ?? item.creditCost ?? 0,
      })),
    };
  } catch (err: any) {
    console.error(`[RecommendAPI] ${recommendType} error:`, err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}
