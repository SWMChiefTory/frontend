import { client } from '@/src/modules/shared/api/client';

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
    const categories = raw.categories ?? raw.data ?? [];
    return categories.map((c: any) => ({
      categoryId: c.category_id ?? c.categoryId ?? '',
      name: c.name ?? '',
      count: c.count ?? 0,
    }));
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
