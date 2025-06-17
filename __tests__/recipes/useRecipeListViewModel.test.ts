import { renderHook, waitFor } from "@testing-library/react-native";
import * as api from "@/src/features/recipe/api/recipe";
import { RecipeSummaryApiResponse } from "@/src/features/recipe/api/recipe";
import { useRecipeListViewModel } from "@/src/features/recipe/viewmodels/useRecipeListViewModel";

jest.mock("@/src/features/recipe/api/recipe");

const mockRecipes: RecipeSummaryApiResponse[] = [
  {
    recipeId: "1",
    title: "레시피 1",
    youtubeId: "yt1",
    count: 10,
    createdAt: "2023-10-01T12:00:00Z",
    thumbnailUrl: "https://example.com/thumbnail1.jpg",
  },
  {
    recipeId: "2",
    title: "레시피 2",
    youtubeId: "yt2",
    count: 5,
    createdAt: "2023-10-02T12:00:00Z",
    thumbnailUrl: "https://example.com/thumbnail2.jpg",
  },
];

describe("레시피 리스트 ViewModel을 사용할 때", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("초기 렌더링이 되면", () => {
    it("recipes는 빈 배열이고, loading은 true이며 error는 null이어야 한다", () => {
      const { result } = renderHook(() => useRecipeListViewModel());

      const { recipes, loading, error } = result.current;

      expect(recipes).toEqual([]);
      expect(loading).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe("레시피 요약 API 호출이 성공하면", () => {
    it("recipes 상태에 데이터를 채우고 loading은 false가 되어야 한다", async () => {
      (api.fetchRecipeSummary as jest.Mock).mockResolvedValue(mockRecipes);

      const { result } = renderHook(() => useRecipeListViewModel());

      await waitFor(() => expect(result.current.loading).toBe(false));

      const { recipes, loading, error } = result.current;

      expect(loading).toBe(false);
      expect(error).toBeNull();

      expect(recipes.length).toBe(mockRecipes.length);

      recipes.forEach((recipe, index) => {
        const expected = mockRecipes[index];

        expect(recipe.recipeId).toBe(expected.recipeId);
        expect(recipe.title).toBe(expected.title);
        expect(recipe.youtubeId).toBe(expected.youtubeId);
        expect(recipe.count).toBe(expected.count);
        expect(recipe.createdAt.getTime()).toBe(
          new Date(expected.createdAt).getTime(),
        );
        expect(recipe.thumbnailUrl).toBe(expected.thumbnailUrl);
      });
    });
  });

  describe("레시피 요약 API 호출이 실패하면", () => {
    it("error 상태에 에러를 저장하고 recipes는 빈 배열이어야 한다", async () => {
      const mockError = new Error("API 실패");
      (api.fetchRecipeSummary as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useRecipeListViewModel());

      await waitFor(() => expect(result.current.loading).toBe(false));

      const { recipes, loading, error } = result.current;

      expect(loading).toBe(false);
      expect(error).toEqual(mockError);
      expect(recipes).toEqual([]);
    });
  });
});
