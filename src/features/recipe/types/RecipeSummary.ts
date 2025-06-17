import { RecipeSummaryApiResponse } from "@/src/features/recipe/api/recipe";

export class RecipeSummary {
  recipeId: string;
  title: string;
  youtubeId: string;
  count: number;
  createdAt: Date;
  thumbnailUrl: string;

  private constructor(
    recipeId: string,
    title: string,
    youtubeId: string,
    count: number,
    createdAt: Date,
    thumbnailUrl: string,
  ) {
    this.recipeId = recipeId;
    this.title = title;
    this.youtubeId = youtubeId;
    this.count = count;
    this.createdAt = createdAt;
    this.thumbnailUrl = thumbnailUrl;
  }

  static create(apiResponse: RecipeSummaryApiResponse): RecipeSummary {
    return new RecipeSummary(
      apiResponse.recipeId,
      apiResponse.title,
      apiResponse.youtubeId,
      apiResponse.count,
      new Date(apiResponse.createdAt),
      apiResponse.thumbnailUrl,
    );
  }
}
