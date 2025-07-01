import { create } from "zustand";
import { RecipeFlow } from "@/src/modules/recipeFlow/types/RecipeFlow";

interface RecipeFlowState {
  recipe: RecipeFlow;
  loading: boolean;
  setRecipe: (recipe: RecipeFlow) => void;
  setLoading: (loading: boolean) => void;
}

export const useRecipeFlowStore = create<RecipeFlowState>((set, get) => ({
  recipe: RecipeFlow.initialize(),
  loading: true,
  setRecipe: (recipe) => set({ recipe }),
  setLoading: (loading) => set({ loading }),
}));
