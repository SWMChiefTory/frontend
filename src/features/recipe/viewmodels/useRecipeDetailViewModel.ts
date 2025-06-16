import { useEffect, useState } from 'react';
import { RecipeDetail } from '@/src/features/recipe/types/RecipeDetail';
import { fetchRecipeDetail } from '@/src/features/recipe/api/recipe';


export function useRecipeDetailViewModel(
    recipeId: string,
    initialYoutubeId?: string,
    initialTitle?: string
): {
    recipe: RecipeDetail;
    loading: boolean;
    error: Error | null;
} {
    const [recipe, setRecipe] = useState<RecipeDetail>(
        RecipeDetail.create(recipeId, initialTitle, initialYoutubeId)
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchRecipeDetail(recipeId);
                setRecipe(prev => prev.updateDetails(data));
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    },  [recipeId, initialTitle, initialYoutubeId]);

    return { recipe, loading, error };
}
