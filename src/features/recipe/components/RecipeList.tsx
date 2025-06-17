import { FlatList, StyleSheet } from "react-native";
import { RecipeSummary } from "@/src/features/recipe/types/RecipeSummary";
import { RecipeCard } from "@/src/features/recipe/components/RecipeCard";

type Props = {
  recipes: RecipeSummary[];
  onPress: (recipe: RecipeSummary) => void;
};

export function RecipeList({ recipes, onPress }: Props) {
  return (
    <FlatList
      data={recipes}
      numColumns={2}
      scrollEnabled={false}
      keyExtractor={(item) => item.recipeId}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={({ item }) => <RecipeCard recipe={item} onPress={onPress} />}
    />
  );
}

const styles = StyleSheet.create({
  columnWrapper: { justifyContent: "space-between" },
});
