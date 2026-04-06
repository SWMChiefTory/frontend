import { client } from '@/src/modules/shared/api/client';
import { z } from 'zod';

const CategorySchema = z.object({
  categoryId: z.string(),
  count: z.number(),
  name: z.string(),
});

const CategoriesResponseSchema = z.object({
  categories: z.array(CategorySchema),
  total_count: z.number().optional(),
  totalCount: z.number().optional(),
});

export interface UserRecipe {
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

export interface Category {
  categoryId: string;
  name: string;
  count: number;
}

// ─── 나의 레시피 (최근) ───
export async function fetchMyRecipes(cursor?: string | null): Promise<{
  data: UserRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}> {
  try {
    const res = await client.get('/recipes/recent', { params: cursor ? { cursor } : {} });
    const raw = res.data;
    const recipes = raw.recent_recipes ?? raw.recipes ?? raw.data ?? [];

    return {
      nextCursor: raw.next_cursor ?? raw.nextCursor ?? null,
      hasNext: raw.has_next ?? raw.hasNext ?? false,
      data: recipes.map((r: any) => mapUserRecipe(r)),
    };
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchMyRecipes error:', err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}

// ─── 카테고리별 레시피 ───
export async function fetchCategorizedRecipes(categoryId: string, cursor?: string | null): Promise<{
  data: UserRecipe[];
  nextCursor: string | null;
  hasNext: boolean;
}> {
  try {
    const res = await client.get(`/recipes/categorized/${categoryId}`, { params: cursor ? { cursor } : {} });
    const raw = res.data;
    const recipes = raw.categorized_recipes ?? raw.recent_recipes ?? raw.recipes ?? raw.data ?? [];

    return {
      nextCursor: raw.next_cursor ?? raw.nextCursor ?? null,
      hasNext: raw.has_next ?? raw.hasNext ?? false,
      data: recipes.map((r: any) => mapUserRecipe(r)),
    };
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchCategorizedRecipes error:', err?.response?.status, err?.message);
    return { data: [], nextCursor: null, hasNext: false };
  }
}

// ─── 카테고리 목록 ───
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await client.get('/recipes/categories');
    const raw = res.data;

    // snake_case → camelCase 변환
    const normalized = {
      categories: (raw.categories ?? []).map((c: any) => ({
        categoryId: c.category_id ?? c.categoryId ?? '',
        name: c.name ?? '',
        count: c.count ?? 0,
      })),
      totalCount: raw.total_count ?? raw.totalCount ?? 0,
    };

    const parsed = CategoriesResponseSchema.safeParse(normalized);
    if (!parsed.success) {
      console.warn('[UserRecipeAPI] categories zod error:', parsed.error.issues);
    }

    return normalized.categories;
  } catch (err: any) {
    console.warn('[UserRecipeAPI] fetchCategories error:', err?.response?.status, err?.message);
    return [];
  }
}

// ─── 카테고리 생성/삭제 ───
export async function createCategory(name: string): Promise<void> {
  await client.post('/recipes/categories', { name });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await client.delete(`/recipes/categories/${categoryId}`);
}

function mapUserRecipe(r: any): UserRecipe {
  return {
    recipeId: r.recipe_id ?? r.recipeId ?? '',
    recipeTitle: r.recipe_title ?? r.recipeTitle ?? '',
    videoId: r.video_id ?? r.videoId ?? '',
    videoThumbnailUrl: r.video_thumbnail_url ?? r.videoThumbnailUrl ?? '',
    videoType: r.video_type ?? r.videoType ?? 'NORMAL',
    channelTitle: r.channel_title ?? r.channelTitle ?? '',
    cookingTime: r.cook_time ?? r.cooking_time ?? r.cookingTime ?? 0,
    servings: r.servings ?? 0,
    description: r.description ?? '',
    recipeStatus: r.recipe_status ?? r.recipeStatus ?? '',
  };
}
