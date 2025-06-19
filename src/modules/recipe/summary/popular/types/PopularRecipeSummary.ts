import { PopularRecipeApiResponse } from "@/src/modules/recipe/summary/api/recipeSummaryApi";

export class PopularRecipeSummary {
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

  static create(apiResponse: PopularRecipeApiResponse): PopularRecipeSummary {
    return new PopularRecipeSummary(
      apiResponse.recipeId,
      apiResponse.title,
      apiResponse.youtubeId,
      apiResponse.count,
      new Date(apiResponse.createdAt),
      apiResponse.thumbnailUrl,
    );
  }
}
