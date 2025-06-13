import {RecipeSummaryApiResponse} from "@/src/features/recipe/api/recipe";


export class RecipeSummary {
    recipeId: string;
    title: string;
    youtubeId: string;
    count: number;
    createdAt: Date;

    private constructor(
        recipeId: string,
        title: string,
        youtubeId: string,
        count: number,
        createdAt: Date,
    ) {
        this.recipeId = recipeId;
        this.title = title;
        this.youtubeId = youtubeId;
        this.count = count;
        this.createdAt = createdAt;
    }

    static create(
        apiResponse: RecipeSummaryApiResponse
    ): RecipeSummary {
        return new RecipeSummary(apiResponse.recipeId, apiResponse.title , apiResponse.youtubeId,apiResponse.count,new Date(apiResponse.createdAt));
    }
}
