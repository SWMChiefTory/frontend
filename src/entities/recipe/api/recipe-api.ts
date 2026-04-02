import { RECIPE_MAP, DEFAULT_RECIPE_ID } from './mock-data';
import type { RecipeEntry } from './types';

/**
 * recipeId로 레시피 데이터를 가져옵니다.
 * 현재는 mock 데이터를 사용하며, API 개발 후 실제 fetch로 교체됩니다.
 */
export async function fetchRecipeById(recipeId: string): Promise<RecipeEntry> {
  // TODO: 실제 API 호출로 교체
  // const res = await fetch(`${API_URL}/recipes/${recipeId}`);
  // return res.json();

  // mock: 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 100));

  const entry = RECIPE_MAP[recipeId] ?? RECIPE_MAP[DEFAULT_RECIPE_ID];
  if (!entry) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }
  return entry;
}
