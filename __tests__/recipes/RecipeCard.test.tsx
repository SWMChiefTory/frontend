import { PopularRecipeCard } from "@/src/features/recipe/components/PopularRecipeCard";
import { recipeSummariesMock } from "@/src/features/recipe/__mocks__/fetchRecipe.mock";
import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@/src/features/recipe/hooks/useRecipeMeta", () => ({
  useRecipeMeta: (youtubeId: string) => ({
    thumbnail: `https://mocked-thumbnail.com/${youtubeId}`,
  }),
}));

describe("RecipeCard 가 주어졌을 때", () => {
  const sampleRecipes = Object.values(recipeSummariesMock);

  describe("레시피 정보를 렌더링하는 경우", () => {
    sampleRecipes.forEach((recipe) => {
      it("썸네일 이미지를 표시해야 한다", () => {
        render(<PopularRecipeCard recipe={recipe} onPress={() => {}} />);
        const image = screen.getByTestId("recipe-image");
        expect(image.props.source.uri).toBe(
          `https://mocked-thumbnail.com/${recipe.youtubeId}`,
        );
      });

      it("제목 텍스트를 화면에 표시해야 한다", () => {
        render(<PopularRecipeCard recipe={recipe} onPress={() => {}} />);
        expect(screen.getByText(recipe.title)).toBeTruthy();
      });
    });
  });

  describe("카드를 클릭한 경우", () => {
    sampleRecipes.forEach((recipe) => {
      it(`onPress 콜백이 ${recipe.title} 레시피로 호출되어야 한다`, () => {
        const mockPress = jest.fn();
        render(<PopularRecipeCard recipe={recipe} onPress={mockPress} />);
        fireEvent.press(screen.getByTestId(`recipe-card-${recipe.recipeId}`));
        expect(mockPress).toHaveBeenCalledWith(recipe);
      });
    });
  });
});
