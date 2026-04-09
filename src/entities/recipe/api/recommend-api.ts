import { z } from 'zod';
import { client } from '@/src/shared/api';

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
  })
  .passthrough();

const RawRecommendResponseSchema = z
  .object({
    recommend_recipes: z.array(RawRecommendRecipeSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  })
  .passthrough();

type RawRecommendRecipe = z.infer<typeof RawRecommendRecipeSchema>;

// ─── Client type ─────────────────────────────────────────────────

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

export interface RecommendRecipesPage {
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
): Promise<RecommendRecipesPage> {
  try {
    const res = await client.get(`/recipes/recommend/${recommendType}`, {
      params: { query: 'ALL' },
    });

    const parsed = RawRecommendResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      console.warn(`[RecommendAPI] schema error for ${recommendType}:`, parsed.error.issues);
      return { data: [], nextCursor: null, hasNext: false };
    }

    return {
      data: parsed.data.recommend_recipes.map(toRecommendRecipe),
      nextCursor: parsed.data.next_cursor ?? null,
      hasNext: parsed.data.has_next ?? false,
    };
  } catch (err: any) {
    console.error(`[RecommendAPI] ${recommendType} error:`, err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}
