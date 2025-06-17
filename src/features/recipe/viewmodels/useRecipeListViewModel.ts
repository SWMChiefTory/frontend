import { useEffect, useState } from "react";
import { RecipeSummary } from "@/src/features/recipe/types/RecipeSummary";
import { fetchRecipeSummary } from "@/src/features/recipe/api/recipe";

export function useRecipeListViewModel(): {
  recipes: RecipeSummary[];
  loading: boolean;
  error: Error | null;
} {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await fetchRecipeSummary();
        setRecipes(data.map((recipe) => RecipeSummary.create(recipe)));
      } catch (error) {
        setError(error as Error);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchRecipes();
  }, []);

  return { recipes, loading, error };
}
