export interface IngredientAmount {
  value: number | null;
  unit: string | null;
}

export interface Ingredient {
  name: string;
  amount: IngredientAmount;
  substitute?: string | null;
  selectionTip?: string | null;
}

export interface Tool {
  name: string;
}

export interface Scene {
  label: string;
  start: string;
  end: string;
}

export interface DescriptionItem {
  content: string;
  start: string;
}

export interface Step {
  order: number;
  title: string;
  description: string | DescriptionItem[];
  tip: string | string[] | null;
  knowledge: string | string[] | null;
  scenes: Scene[] | null;
  timerSeconds: number | null;
  heatLevel?: string | null;
}

export interface Recipe {
  title: string;
  description: string | null;
  servings: number | null;
  cookingTimeMinutes: number | null;
  difficulty: string;
  category: string;
  ingredients: Ingredient[];
  tools: Tool[];
  steps: Step[];
  servingTip?: string | null;
}

export interface RecipeEntry {
  recipe: Recipe;
  videoId: string;
}
