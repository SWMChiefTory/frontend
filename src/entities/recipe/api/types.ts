export type IngredientAmount = {
  value: number | null;
  unit: string | null;
}

export type Ingredient = {
  name: string;
  amount: IngredientAmount;
  substitute?: string | null;
  selectionTip?: string | null;
}

export type Tool = {
  name: string;
}

export type Scene = {
  label: string;
  start: string;
  end: string;
}

export type DescriptionItem = {
  content: string;
  start: string;
}

export type Step = {
  order: number;
  title: string;
  description: string | DescriptionItem[];
  tip: string | string[] | null;
  knowledge: string | string[] | null;
  scenes: Scene[] | null;
  timerSeconds: number | null;
  heatLevel?: string | null;
}

export type Recipe = {
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

export type RecipeEntry = {
  recipe: Recipe;
  videoId: string;
  videoType?: 'SHORTS' | 'NORMAL';
}
