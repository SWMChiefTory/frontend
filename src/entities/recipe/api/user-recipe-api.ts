import { z } from 'zod';
import { client, parseOrNull } from '@/src/shared/api';

// ─── Raw schemas ─────────────────────────────────────────────────

const RawUserRecipeSchema = z
  .object({
    recipe_id: z.string(),
    recipe_title: z.string(),
    video_id: z.string().nullish(),
    video_thumbnail_url: z.string().nullish(),
    video_type: z.enum(['SHORTS', 'NORMAL']).nullish(),
    channel_title: z.string().nullish(),
    cook_time: z.number().nullish(),
    servings: z.number().nullish(),
    description: z.string().nullish(),
    recipe_status: z.string().nullish(),
  });

const RawRecentRecipesResponseSchema = z
  .object({
    recent_recipes: z.array(RawUserRecipeSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  });

const RawCategorizedRecipesResponseSchema = z
  .object({
    categorized_recipes: z.array(RawUserRecipeSchema).default([]),
    next_cursor: z.string().nullish(),
    has_next: z.boolean().nullish(),
  });

const RawCategorySchema = z
  .object({
    category_id: z.string(),
    name: z.string(),
    count: z.number().default(0),
  });

const RawCategoriesResponseSchema = z
  .object({
    categories: z.array(RawCategorySchema).default([]),
    total_count: z.number().nullish(),
  });

type RawUserRecipe = z.infer<typeof RawUserRecipeSchema>;
type RawCategory = z.infer<typeof RawCategorySchema>;

// ─── Client types ────────────────────────────────────────────────

export type UserRecipe = {
  recipeId: string;
  recipeTitle: string;
  videoId: string;
  videoThumbnailUrl: string;
  videoType: 'SHORTS' | 'NORMAL';
  channelTitle: string;
  cookingTime: number;
  servings: number;
  description: string;
  recipeStatus: string;
}

export type Category = {
  categoryId: string;
  name: string;
  count: number;
}

export type UserRecipesPage = {
  data: UserRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}

// ─── Transformers ────────────────────────────────────────────────

function toUserRecipe(raw: RawUserRecipe): UserRecipe {
  return {
    recipeId: raw.recipe_id,
    recipeTitle: raw.recipe_title,
    videoId: raw.video_id ?? '',
    videoThumbnailUrl: raw.video_thumbnail_url ?? '',
    videoType: raw.video_type ?? 'NORMAL',
    channelTitle: raw.channel_title ?? '',
    cookingTime: raw.cook_time ?? 0,
    servings: raw.servings ?? 0,
    description: raw.description ?? '',
    recipeStatus: raw.recipe_status ?? '',
  };
}

function toCategory(raw: RawCategory): Category {
  return {
    categoryId: raw.category_id,
    name: raw.name,
    count: raw.count,
  };
}

// ─── APIs ────────────────────────────────────────────────────────

export async function fetchMyRecipes(cursor?: string | null): Promise<UserRecipesPage> {
  try {
    const res = await client.get('/recipes/recent', { params: cursor ? { cursor } : {} });
    const parsed = parseOrNull(RawRecentRecipesResponseSchema, res.data, 'UserRecipeAPI/my');
    if (!parsed) return { data: [], nextCursor: null, hasNext: false };
    return {
      data: parsed.recent_recipes.map(toUserRecipe),
      nextCursor: parsed.next_cursor ?? null,
      hasNext: parsed.has_next ?? false,
    };
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchMyRecipes error:', err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}

export async function fetchCategorizedRecipes(
  categoryId: string,
  cursor?: string | null,
): Promise<UserRecipesPage> {
  try {
    const res = await client.get(`/recipes/categorized/${categoryId}`, {
      params: cursor ? { cursor } : {},
    });
    const parsed = parseOrNull(RawCategorizedRecipesResponseSchema, res.data, 'UserRecipeAPI/categorized');
    if (!parsed) return { data: [], nextCursor: null, hasNext: false };
    return {
      data: parsed.categorized_recipes.map(toUserRecipe),
      nextCursor: parsed.next_cursor ?? null,
      hasNext: parsed.has_next ?? false,
    };
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchCategorizedRecipes error:', err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await client.get('/recipes/categories');
    const parsed = parseOrNull(RawCategoriesResponseSchema, res.data, 'UserRecipeAPI/categories');
    if (!parsed) return [];
    return parsed.categories.map(toCategory);
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchCategories error:', err?.response?.status, err?.message);
    return [];
  }
}

export async function createCategory(name: string): Promise<void> {
  await client.post('/recipes/categories', { name });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await client.delete(`/recipes/categories/${categoryId}`);
}

/**
 * 내 레시피에서 제거 = 북마크 해제
 * (실제 레시피 자체를 삭제하는 게 아니라 내 목록에서 빼는 것)
 */
export async function deleteUserRecipe(recipeId: string): Promise<void> {
  await client.delete(`/recipes/${recipeId}/bookmark`);
}
