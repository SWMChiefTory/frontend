import { View, StyleSheet } from "react-native";
import { RecipeSectionHeader } from "../../../summary/shared/components/SectionHeader";
import { PopularSummaryRecipe } from "../../../summary/popular/types/Recipe";
import { PopularRecipeSummaryList } from "../../../summary/popular/components/List";
interface Props {
  recipes: PopularSummaryRecipe[];
  onRecipePress: (recipe: PopularSummaryRecipe) => void;
  onViewAllPress: () => void;
}

export function PopularRecipeSection({
  recipes,
  onRecipePress,
  onViewAllPress,
}: Props) {
  return (
    <View style={styles.recipeSectionCard}>
      <RecipeSectionHeader title="추천 레시피" onPress={onViewAllPress} />
      <PopularRecipeSummaryList recipes={recipes} onPress={onRecipePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  recipeSectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 69, 0, 0.08)",
  },
});
