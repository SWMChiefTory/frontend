import { z } from 'zod';
import { client } from '@/src/shared/api';

// ─── Recipe creation status ──────────────────────────────────────
export enum RecipeStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  BANNED = 'BANNED',
}

// ─── Schemas ─────────────────────────────────────────────────────
const RawCreateRecipeResponseSchema = z
  .object({
    recipe_id: z.string().nullish(),
    recipeId: z.string().nullish(),
  })
  .passthrough();

const RawProgressResponseSchema = z
  .object({
    recipe_status: z.string().nullish(),
    recipeStatus: z.string().nullish(),
  })
  .passthrough();

// ─── APIs ────────────────────────────────────────────────────────

export async function createRecipe(videoUrl: string): Promise<string> {
  const res = await client.post('/recipes', { video_url: videoUrl, videoUrl });
  const parsed = RawCreateRecipeResponseSchema.parse(res.data);
  const recipeId = parsed.recipe_id ?? parsed.recipeId;
  if (!recipeId) throw new Error('레시피 ID를 받지 못했어요');
  return recipeId;
}

export async function fetchRecipeProgress(recipeId: string): Promise<RecipeStatus> {
  const res = await client.get(`/recipes/progress/${recipeId}`);
  const parsed = RawProgressResponseSchema.parse(res.data);
  const status = (parsed.recipe_status ?? parsed.recipeStatus) as RecipeStatus | undefined;
  return status ?? RecipeStatus.IN_PROGRESS;
}
