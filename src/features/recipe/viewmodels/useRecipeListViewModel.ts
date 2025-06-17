import { useEffect, useState } from "react";
import { PopularRecipe } from "@/src/features/recipe/types/PopularRecipe";
import { fetchRecipeSummary } from "@/src/features/recipe/api/recipe";
import { RecentRecipe } from "@/src/features/recipe/types/RecentRecipe";

export function useRecipeListViewModel(): {
  popularRecipes: PopularRecipe[];
  recentRecipes: RecentRecipe[];
  loading: boolean;
  error: Error | null;
} {
  const [popularRecipes, setPopularRecipes] = useState<PopularRecipe[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<RecentRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const data = await fetchRecipeSummary();
        setPopularRecipes(
          data.popular.map((recipe) => PopularRecipe.create(recipe)),
        );
        setRecentRecipes(
          data.recent.map((recipe) => RecentRecipe.create(recipe)),
        );
      } catch (error) {
        setError(error as Error);
        setPopularRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchRecipes();
  }, []);

  return {
    popularRecipes: popularRecipes,
    recentRecipes: recentRecipes,
    loading,
    error,
  };
}
