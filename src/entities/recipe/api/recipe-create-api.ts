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
  });

const RawProgressResponseSchema = z
  .object({
    recipe_status: z.string().nullish(),
  });

// ─── APIs ────────────────────────────────────────────────────────

export async function createRecipe(videoUrl: string): Promise<string> {
  const res = await client.post('/recipes', { video_url: videoUrl });
  const parsed = RawCreateRecipeResponseSchema.parse(res.data);
  if (!parsed.recipe_id) throw new Error('레시피 ID를 받지 못했어요');
  return parsed.recipe_id;
}

export async function fetchRecipeProgress(recipeId: string): Promise<RecipeStatus> {
  const res = await client.get(`/recipes/progress/${recipeId}`);
  const parsed = RawProgressResponseSchema.parse(res.data);
  return (parsed.recipe_status as RecipeStatus | undefined) ?? RecipeStatus.IN_PROGRESS;
}
