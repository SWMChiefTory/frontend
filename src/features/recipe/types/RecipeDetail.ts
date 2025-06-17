import { RecipeDetailApiResponse } from "@/src/features/recipe/api/recipe";
import { CookStep } from "@/src/features/recipe/cook/types/CookStep";

export class RecipeDetail {
  recipeId: string;
  title: string;
  youtubeId: string;
  summary: string;
  totalTime: string;
  ingredients: string[];
  steps: CookStep[];

  private constructor(
    recipeId: string,
    title: string,
    youtubeId: string,
    summary: string,
    totalTime: string,
    ingredients: string[],
    steps: CookStep[],
  ) {
    this.recipeId = recipeId;
    this.title = title;
    this.youtubeId = youtubeId;
    this.summary = summary;
    this.totalTime = totalTime;
    this.ingredients = ingredients;
    this.steps = steps;
  }

  static create(
    recipeId: string,
    title?: string,
    youtubeId?: string,
  ): RecipeDetail {
    return new RecipeDetail(
      recipeId,
      title ?? "",
      youtubeId ?? "",
      "",
      "",
      [],
      [],
    );
  }

  static formatTime(totalTime: number): string {
    if (totalTime <= 0) {
      return "준비 시간 없음";
    }

    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}시간 ${minutes}분`;
    } else if (hours > 0) {
      return `${hours}시간`;
    } else {
      return `${minutes}분`;
    }
  }

  updateDetails(apiResponse: RecipeDetailApiResponse): RecipeDetail {
    return new RecipeDetail(
      this.recipeId,
      apiResponse.title,
      apiResponse.youtubeId,
      apiResponse.summary,
      RecipeDetail.formatTime(apiResponse.totalTime),
      apiResponse.ingredients,
      apiResponse.steps.map((step) => CookStep.of(step)),
    );
  }
}
