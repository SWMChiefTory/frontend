import { create } from 'zustand';

type CreatingRecipe = {
  recipeId: string;
  videoUrl: string;
  startedAt: number;
}

type RecipeCreateStore = {
  /** 현재 생성 중인 레시피들의 정보 */
  creatingRecipes: CreatingRecipe[];
  addCreating: (recipeId: string, videoUrl: string) => void;
  removeCreating: (recipeId: string) => void;
}

export const useRecipeCreateStore = create<RecipeCreateStore>((set) => ({
  creatingRecipes: [],
  addCreating: (recipeId, videoUrl) =>
    set((s) => ({
      creatingRecipes: [
        ...s.creatingRecipes.filter((r) => r.recipeId !== recipeId),
        { recipeId, videoUrl, startedAt: Date.now() },
      ],
    })),
  removeCreating: (recipeId) =>
    set((s) => ({
      creatingRecipes: s.creatingRecipes.filter((r) => r.recipeId !== recipeId),
    })),
}));
