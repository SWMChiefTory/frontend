import { z } from 'zod';
import { client, parseOrNull } from '@/src/shared/api';

/**
 * 단일 레시피의 가벼운 메타데이터.
 *
 * - `/recipes/overview/{id}` — 조회수 카운팅 없이 호출
 * - 유저 소유 여부와 무관하게 등록된 레시피 정보를 가져옴
 * - 큐레이션 카드, 검색 결과 미리보기 등에 사용
 *
 * 백엔드는 이미 camelCase로 응답 (웹뷰 schema와 동일).
 */

const RawRecipeTagSchema = z.object({
  name: z.string(),
});

const RawRecipeOverviewSchema = z
  .object({
    recipeId: z.string(),
    recipeTitle: z.string(),
    tags: z.array(RawRecipeTagSchema).nullish(),
    isViewed: z.boolean().nullish(),
    description: z.string().nullish(),
    servings: z.number().int().nullish(),
    cookingTime: z.number().int().nullish(),
    videoId: z.string(),
    count: z.number().int().nullish(),
    videoUrl: z.string(),
    videoType: z.string(),
    videoThumbnailUrl: z.string(),
    videoSeconds: z.number().int(),
    creditCost: z.number().nullish(),
  });

type RawRecipeOverview = z.infer<typeof RawRecipeOverviewSchema>;

export type RecipeOverview = {
  recipeId: string;
  recipeTitle: string;
  description: string;
  servings: number;
  cookingTime: number;
  tags: string[];
  videoId: string;
  videoUrl: string;
  videoType: string;
  videoThumbnailUrl: string;
  videoSeconds: number;
  creditCost: number;
  isViewed: boolean;
  count: number;
}

function toRecipeOverview(raw: RawRecipeOverview): RecipeOverview {
  return {
    recipeId: raw.recipeId,
    recipeTitle: raw.recipeTitle,
    description: raw.description ?? '',
    servings: raw.servings ?? 0,
    cookingTime: raw.cookingTime ?? 0,
    tags: (raw.tags ?? []).map((t) => t.name),
    videoId: raw.videoId,
    videoUrl: raw.videoUrl,
    videoType: raw.videoType,
    videoThumbnailUrl: raw.videoThumbnailUrl,
    videoSeconds: raw.videoSeconds,
    creditCost: raw.creditCost ?? 0,
    isViewed: raw.isViewed ?? false,
    count: raw.count ?? 0,
  };
}

export async function fetchRecipeOverview(
  recipeId: string,
): Promise<RecipeOverview | null> {
  try {
    const res = await client.get(`/recipes/overview/${recipeId}`);
    const parsed = parseOrNull(RawRecipeOverviewSchema, res.data, 'RecipeOverviewAPI');
    if (!parsed) return null;
    return toRecipeOverview(parsed);
  } catch (err: any) {
    console.warn(
      '[RecipeOverviewAPI] fetch error:',
      err?.response?.status,
      err?.message,
    );
    return null;
  }
}
