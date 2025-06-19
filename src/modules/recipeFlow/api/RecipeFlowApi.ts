import { recipeDetailApiMock } from "@/src/modules/recipe/detail/api/__mocks__/fetchRecipeDetail.mock";

export interface RecipeFlowApiResponse {
  title: string;
  summary: string;
  ingredients: string[];
  steps: CookStepApiResponse[];
  totalTime: number;
  youtubeId: string;
}

export interface CookStepApiResponse {
  stepId: string;
  index: number;
  description: string;
  startTime: number;
  endTime: number;
}
export async function fetchRecipeFlow(
  recipeId: string,
): Promise<RecipeFlowApiResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const recipe = recipeDetailApiMock;
      if (!recipe) {
        reject(new Error("레시피를 찾을 수 없습니다."));
      } else {
        resolve(recipe);
      }
    }, 1000);
  });
}
