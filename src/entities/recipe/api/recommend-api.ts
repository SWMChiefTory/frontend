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

interface RawRecommendResponse {
  nextCursor: string | null;
  hasNext: boolean;
  recommendRecipes: any[];
}

export async function fetchRecommendRecipes(
  recommendType: RecommendType,
  cursor?: string | null,
): Promise<{ data: RecommendRecipe[]; nextCursor: string | null; hasNext: boolean }> {
  const res = await client.get<RawRecommendResponse>(
    `/recipes/recommend/${recommendType}`,
    { params: { cursor, query: 'ALL' } },
  );

  const raw = res.data;
  return {
    nextCursor: raw.nextCursor,
    hasNext: raw.hasNext,
    data: (raw.recommendRecipes ?? []).map((item: any) => ({
      recipeId: item.recipeId,
      recipeTitle: item.recipeTitle,
      videoThumbnailUrl: item.videoThumbnailUrl,
      videoSeconds: item.videoSeconds,
      channelTitle: item.channelTitle ?? '',
      cookingTime: item.cookingTime ?? 0,
      creditCost: item.creditCost ?? 0,
    })),
  };
}
