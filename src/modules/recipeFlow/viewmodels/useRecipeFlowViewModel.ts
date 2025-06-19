import { useEffect, useState } from "react";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";
import { fetchRecipeFlow } from "@/src/modules/recipeFlow/api/RecipeFlowApi";

export function useRecipeFlowViewModel(
  recipeId: string,
  initialYoutubeId?: string,
  initialTitle?: string,
): {
  recipe: RecipeFlow;
  loading: boolean;
  error: Error | null;
} {
  const [recipe, setRecipe] = useState<RecipeFlow>(
    RecipeFlow.create(recipeId, initialTitle, initialYoutubeId),
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchRecipeFlow(recipeId);
        setRecipe((prev) => prev.updateDetails(data));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [recipeId, initialTitle, initialYoutubeId]);

  return { recipe, loading, error };
}
