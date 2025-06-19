import * as api from "@/src/modules/recipeFlow/api/RecipeFlowApi";
import { useRecipeFlowViewModel } from "@/src/modules/recipeFlow/viewmodels/useRecipeFlowViewModel";
import { renderHook, waitFor } from "@testing-library/react-native";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import { recipeDetailApiMock } from "@/src/modules/recipe/detail/api/__mocks__/fetchRecipeDetail.mock";

jest.mock("@/src/modules/recipeFlow/api/RecipeFlowApi");

describe("레시피 상세 조회 뷰모델을 사용할 때", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const defaultParams = {
    initialRecipeId: "success-id",
    initialTitle: "초기 제목",
    initialYoutubeId: "initial-yt-id",
  };

  const errorParams = {
    initialRecipeId: "error-id",
    initialTitle: "초기 제목",
    initialYoutubeId: "initial-yt-id",
  };

  describe("초기 렌더링이 되면", () => {
    it("초기값을 기반으로 summary 상태를 설정해야 한다", () => {
      const { result } = renderHook(() =>
        useRecipeFlowViewModel(
          defaultParams.initialRecipeId,
          defaultParams.initialYoutubeId,
          defaultParams.initialTitle,
        ),
      );

      const { recipe, loading, error } = result.current;

      expect(recipe.recipeId).toBe(defaultParams.initialRecipeId);
      expect(recipe.title).toBe(defaultParams.initialTitle);
      expect(recipe.youtubeId).toBe(defaultParams.initialYoutubeId);
      expect(recipe.summary).toBe("");
      expect(loading).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe("API 호출이 성공하면", () => {
    it("API 응답으로 summary 등 상세 정보를 업데이트해야 한다", async () => {
      (api.fetchRecipeFlow as jest.Mock).mockResolvedValue(recipeDetailApiMock);

      const { result } = renderHook(() =>
        useRecipeFlowViewModel(
          defaultParams.initialRecipeId,
          defaultParams.initialYoutubeId,
          defaultParams.initialTitle,
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const { recipe, error, loading } = result.current;

      expect(loading).toBe(false);
      expect(error).toBeNull();

      expect(recipe.title).toBe(recipeDetailApiMock.title);
      expect(recipe.youtubeId).toBe(recipeDetailApiMock.youtubeId);
      expect(recipe.summary).toBe(recipeDetailApiMock.summary);
      expect(recipe.totalTime).toBe(
        RecipeFlow.formatTime(recipeDetailApiMock.totalTime),
      );
      expect(recipe.ingredients).toEqual(recipeDetailApiMock.ingredients);
      recipe.steps.forEach((step, index) => {
        const apiStep = recipeDetailApiMock.steps[index];
        expect(step.stepId).toBe(apiStep.stepId);
        expect(step.index).toBe(apiStep.index);
        expect(step.description).toBe(apiStep.description);
        expect(step.startTime).toBe(apiStep.startTime);
        expect(step.endTime).toBe(apiStep.endTime);
      });
    });

    it("초기값이 없으면 API 응답의 title과 youtubeId를 사용해야 한다", async () => {
      (api.fetchRecipeFlow as jest.Mock).mockResolvedValue(recipeDetailApiMock);

      const { result } = renderHook(() =>
        useRecipeFlowViewModel(defaultParams.initialRecipeId),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const { recipe, error, loading } = result.current;

      expect(loading).toBe(false);
      expect(error).toBeNull();

      expect(recipe.title).toBe(recipeDetailApiMock.title);
      expect(recipe.youtubeId).toBe(recipeDetailApiMock.youtubeId);
    });
  });

  describe("API 호출이 실패하면", () => {
    it("error 상태에 에러를 저장하고, recipe는 초기값을 유지해야 한다", async () => {
      const mockError = new Error("API 실패");
      (api.fetchRecipeFlow as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRecipeFlowViewModel(
          errorParams.initialRecipeId,
          errorParams.initialYoutubeId,
          errorParams.initialTitle,
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const { recipe, error, loading } = result.current;

      expect(loading).toBe(false);
      expect(error).toEqual(mockError);

      expect(recipe.recipeId).toBe(errorParams.initialRecipeId);
      expect(recipe.title).toBe(errorParams.initialTitle);
      expect(recipe.youtubeId).toBe(errorParams.initialYoutubeId);
      expect(recipe.summary).toBe("");
    });
  });
});
