import {
  recipeDetailApiMock,
  popularRecipesApiMock,
  recentRecipesApiMock,
} from "@/src/features/recipe/__mocks__/fetchRecipe.mock";

export interface RecipeDetailApiResponse {
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

export interface PopularRecipeApiResponse {
  recipeId: string;
  title: string;
  youtubeId: string;
  count: number;
  createdAt: string;
  thumbnailUrl: string;
}

export interface RecentRecipeApiResponse {
  recipeId: string;
  title: string;
  youtubeId: string;
  createdAt: string;
  thumbnailUrl: string;
  progress: number;
  watchedTime: string;
}

export interface RecipeSummaryResponse {
  recent: RecentRecipeApiResponse[];
  popular: PopularRecipeApiResponse[];
}

export async function fetchRecipeDetail(
  recipeId: string,
): Promise<RecipeDetailApiResponse> {
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

export async function fetchRecipeSummary(): Promise<RecipeSummaryResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        recent: Object.values(recentRecipesApiMock),
        popular: Object.values(popularRecipesApiMock),
      });
    }, 1000);
  });
}
