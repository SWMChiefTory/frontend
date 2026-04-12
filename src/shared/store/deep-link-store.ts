import { create } from 'zustand';

export type DeepLinkIntent =
  | { type: 'cooking'; recipeId: string }
  | { type: 'detail'; recipeId: string }
  | { type: 'share'; videoUrl: string };

type DeepLinkStore = {
  pending: DeepLinkIntent | null;
  setPending: (intent: DeepLinkIntent) => void;
  consume: () => void;
};

export const useDeepLinkStore = create<DeepLinkStore>((set) => ({
  pending: null,
  setPending: (intent) => set({ pending: intent }),
  consume: () => set({ pending: null }),
}));
