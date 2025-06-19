import { FlatList, StyleSheet } from "react-native";
import { PopularRecipeSummary } from "@/src/modules/recipe/summary/popular/types/PopularRecipeSummary";
import { PopularRecipeSummaryCard } from "@/src/modules/recipe/summary/popular/components/PopularRecipeSummaryCard";

type Props = {
  recipes: PopularRecipeSummary[];
  onPress: (recipe: PopularRecipeSummary) => void;
};

export function PopularRecipeSummaryList({ recipes, onPress }: Props) {
  return (
    <FlatList
      data={recipes}
      numColumns={2}
      scrollEnabled={false}
      keyExtractor={(item) => item.recipeId}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={({ item }) => (
        <PopularRecipeSummaryCard recipe={item} onPress={onPress} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  columnWrapper: { justifyContent: "space-between" },
});
