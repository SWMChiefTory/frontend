import { create } from 'zustand';

type CreatingRecipe = {
  recipeId: string;
  videoUrl: string;
  startedAt: number;
}

type RecipeCreateStore = {
  /** 딥링크로 받은 URL — 다음 마운트 시 시트 자동 오픈 */
  pendingVideoUrl: string | null;
  requestOpen: (videoUrl?: string) => void;
  consume: () => void;

  /** 현재 생성 중인 레시피들의 정보 */
  creatingRecipes: CreatingRecipe[];
  addCreating: (recipeId: string, videoUrl: string) => void;
  removeCreating: (recipeId: string) => void;
}

export const useRecipeCreateStore = create<RecipeCreateStore>((set) => ({
  pendingVideoUrl: null,
  requestOpen: (videoUrl) => set({ pendingVideoUrl: videoUrl ?? '' }),
  consume: () => set({ pendingVideoUrl: null }),

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
