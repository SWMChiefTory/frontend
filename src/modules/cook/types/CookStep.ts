import { CookStepApiResponse } from "@/src/modules/recipeFlow/api/RecipeFlowApi";

export class CookStep {
  stepId: string;
  index: number;
  description: string;
  startTime: number;
  endTime: number;

  private constructor(
    stepId: string,
    index: number,
    description: string,
    startTime: number,
    endTime: number,
  ) {
    this.stepId = stepId;
    this.description = description;
    this.startTime = startTime;
    this.endTime = endTime;
    this.index = index;
  }

  static of(apiResponse: CookStepApiResponse): CookStep {
    return new CookStep(
      apiResponse.stepId,
      apiResponse.index,
      apiResponse.description,
      apiResponse.startTime,
      apiResponse.endTime,
    );
  }
}
