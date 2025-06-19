import { RecipeFlowMode } from "@/src/modules/recipeFlow/types/RecipeFlowMode";
import { CustomBackButton } from "@/src/modules/shared/components/layout/CustomBackButton";

type RecipeFlowHeaderProps = {
  mode: RecipeFlowMode;
  onBack: () => void;
};

export function RecipeFlowHeader({ mode, onBack }: RecipeFlowHeaderProps) {
  return mode === RecipeFlowMode.Cook ? (
    <CustomBackButton onPress={onBack} />
  ) : (
    <CustomBackButton />
  );
}
