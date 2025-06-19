import { CookStep } from "@/src/modules/cook/types/CookStep";
import { RecipeFlowApiResponse } from "@/src/modules/recipeFlow/api/RecipeFlowApi";

export class RecipeFlow {
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
  ): RecipeFlow {
    return new RecipeFlow(
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

  updateDetails(apiResponse: RecipeFlowApiResponse): RecipeFlow {
    return new RecipeFlow(
      this.recipeId,
      apiResponse.title,
      apiResponse.youtubeId,
      apiResponse.summary,
      RecipeFlow.formatTime(apiResponse.totalTime),
      apiResponse.ingredients,
      apiResponse.steps.map((step) => CookStep.of(step)),
    );
  }
}
