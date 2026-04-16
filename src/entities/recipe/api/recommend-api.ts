import { z } from 'zod';
import { client, parseOrNull } from '@/src/shared/api';

export enum RecommendType {
  CHEF = 'CHEF',
  TRENDING = 'TRENDING',
  POPULAR = 'POPULAR',
}

// ─── Raw schema (server response, snake_case) ───────────────────

const RawRecommendRecipeSchema = z
  .object({
    recipe_id: z.string(),
    recipe_title: z.string(),
    video_thumbnail_url: z.string().nullish(),
    video_seconds: z.number().nullish(),
    channel_title: z.string().nullish(),
    cooking_time: z.number().nullish(),
    servings: z.number().nullish(),
    description: z.string().nullish(),
    credit_cost: z.number().nullish(),
  });

const RawRecommendResponseSchema = z
  .object({
    recommend_recipes: z.array(RawRecommendRecipeSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  });

type RawRecommendRecipe = z.infer<typeof RawRecommendRecipeSchema>;

// ─── Client type ─────────────────────────────────────────────────

export type RecommendRecipe = {
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

export type RecommendRecipesPage = {
  data: RecommendRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}

// ─── Transformer ─────────────────────────────────────────────────

function toRecommendRecipe(raw: RawRecommendRecipe): RecommendRecipe {
  return {
    recipeId: raw.recipe_id,
    recipeTitle: raw.recipe_title,
    videoThumbnailUrl: raw.video_thumbnail_url ?? '',
    videoSeconds: raw.video_seconds ?? 0,
    channelTitle: raw.channel_title ?? '',
    cookingTime: raw.cooking_time ?? 0,
    servings: raw.servings ?? 0,
    description: raw.description ?? '',
    creditCost: raw.credit_cost ?? 0,
  };
}

// ─── API ─────────────────────────────────────────────────────────

export async function fetchRecommendRecipes(
  recommendType: RecommendType,
  cursor?: string | null,
): Promise<RecommendRecipesPage> {
  try {
    const res = await client.get(`/recipes/recommend/${recommendType}`, {
      params: { query: 'ALL', ...(cursor ? { cursor } : {}) },
    });

    const parsed = parseOrNull(RawRecommendResponseSchema, res.data, `RecommendAPI/${recommendType}`);
    if (!parsed) return { data: [], nextCursor: null, hasNext: false };

    return {
      data: parsed.recommend_recipes.map(toRecommendRecipe),
      nextCursor: parsed.next_cursor ?? null,
      hasNext: parsed.has_next ?? false,
    };
  } catch (err: any) {
    console.error(`[RecommendAPI] ${recommendType} error:`, err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}
