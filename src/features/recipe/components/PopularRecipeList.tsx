import { FlatList, StyleSheet } from "react-native";
import { PopularRecipe } from "@/src/features/recipe/types/PopularRecipe";
import { PopularRecipeCard } from "@/src/features/recipe/components/PopularRecipeCard";

type Props = {
  recipes: PopularRecipe[];
  onPress: (recipe: PopularRecipe) => void;
};

export function PopularRecipeList({ recipes, onPress }: Props) {
  return (
    <FlatList
      data={recipes}
      numColumns={2}
      scrollEnabled={false}
      keyExtractor={(item) => item.recipeId}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={({ item }) => (
        <PopularRecipeCard recipe={item} onPress={onPress} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  columnWrapper: { justifyContent: "space-between" },
});
