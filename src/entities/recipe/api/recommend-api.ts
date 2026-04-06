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
    console.log(`[RecommendAPI] ${recommendType} response keys:`, Object.keys(raw));

    // 웹뷰와 동일한 매핑: raw.recommendRecipes 배열에서 변환
    const recipes = raw.recommendRecipes ?? raw.data ?? [];
    console.log(`[RecommendAPI] ${recommendType} recipes count:`, recipes.length);

    return {
      nextCursor: raw.nextCursor ?? null,
      hasNext: raw.hasNext ?? false,
      data: recipes.map((item: any) => ({
        recipeId: item.recipeId ?? '',
        recipeTitle: item.recipeTitle ?? '',
        videoThumbnailUrl: item.videoThumbnailUrl ?? '',
        videoSeconds: item.videoSeconds ?? 0,
        channelTitle: item.channelTitle ?? '',
        cookingTime: item.cookingTime ?? 0,
        creditCost: item.creditCost ?? 0,
      })),
    };
  } catch (err: any) {
    console.error(`[RecommendAPI] ${recommendType} error:`, err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}
